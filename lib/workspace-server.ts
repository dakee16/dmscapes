// Server-only access boundary. The service key never reaches a client component.
import { NextResponse } from "next/server";
import { getServiceClient } from "./supabase-server";
import { getUserId } from "./supabase-auth";
import { rateLimit } from "./rate-limit";
export const privateHeaders = { "Cache-Control": "private, no-store", "Referrer-Policy": "no-referrer" };
export const workspaceJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: privateHeaders });
export const workspaceUnavailable = () => workspaceJson({ error: "Shared rooms aren't available in this environment yet. Your existing saved designs are still available." }, 503);
export const uuid = (v: unknown): v is string => typeof v === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export async function workspaceIdentity(request: Request, write = false) {
  const db = getServiceClient();
  if (!db) return { response: workspaceUnavailable() } as const;
  const userId = await getUserId(request);
  if (!userId) return { response: workspaceJson({ error: "Sign in to open your rooms." }, 401) } as const;
  const limit = rateLimit(request, `workspace-${write ? "write" : "read"}-${userId}`, write ? 90 : 240, 60_000);
  if (!limit.allowed) return { response: workspaceJson({ error: "Please wait a moment and try again." }, 429) } as const;
  return { db, userId } as const;
}
export async function workspaceBody(request: Request): Promise<Record<string, unknown> | null> {
  // Bound the stream, not just Content-Length (which may be absent or dishonest).
  if (!request.body) return null;
  const reader = request.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > 750_000) { await reader.cancel(); return null; } chunks.push(value); }
    const bytes = new Uint8Array(size); let offset = 0; for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
    const body = JSON.parse(new TextDecoder().decode(bytes));
    return body && typeof body === "object" && !Array.isArray(body) ? body : null;
  } catch { return null; }
}
export async function workspaceAccess(db: NonNullable<ReturnType<typeof getServiceClient>>, id: string, userId: string) {
  const { data: member, error } = await db.from("workspace_members").select("role").eq("workspace_id", id).eq("user_id", userId).maybeSingle();
  if (error) return { response: workspaceUnavailable() } as const;
  if (!member) return { response: workspaceJson({ error: "Room not found or access removed." }, 404) } as const;
  const { data: workspace, error: roomError } = await db.from("room_workspaces").select("*").eq("id", id).single();
  if (roomError || !workspace) return { response: workspaceJson({ error: "Room not found." }, 404) } as const;
  const { data: owner } = await db.from("profiles").select("plan").eq("id", workspace.owner_id).maybeSingle();
  return { workspace, role: member.role, ownerPro: owner?.plan === "pro" } as const;
}
export async function workspaceAction(db: NonNullable<ReturnType<typeof getServiceClient>>, userId: string, id: string | null, action: string, payload: Record<string, unknown>) {
  const { data, error } = await db.rpc(["comment", "resolve"].includes(action) ? "dormscape_workspace_comment" : "dormscape_workspace_action", { p_actor: userId, p_id: id, p_action: action, p_payload: payload });
  if (error) { console.error("workspace action failed", error.code); return workspaceUnavailable(); }
  if (data?.error) return workspaceJson({ error: data.error }, data.status ?? 400);
  return workspaceJson(data);
}
