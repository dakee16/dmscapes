import { createHash, randomBytes } from "node:crypto";
import type { getServiceClient } from "./supabase-server";
import { isEmailConfigured, sendEmail } from "./email";
import { workspaceInvitationEmail } from "./email-templates";
import { workspaceAccess, workspaceAction, workspaceJson } from "./workspace-server";
import { rateLimit } from "./rate-limit";

export async function inviteRoommate(request: Request, db: NonNullable<ReturnType<typeof getServiceClient>>, actor: string, id: string, body: Record<string, unknown>) {
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (email.length > 254 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)) return workspaceJson({ error: "Enter your roommate's email address." }, 400);
  if (body.role !== "editor" && body.role !== "commenter") return workspaceJson({ error: "Choose editing or comment access." }, 400);
  const access = await workspaceAccess(db, id, actor);
  if (access.response) return access.response;
  if (access.role !== "owner" || !access.ownerPro) return workspaceJson({ error: "Only a Pro room owner can invite roommates." }, 403);
  if (!isEmailConfigured()) return workspaceJson({ error: "Invitation emails aren't configured yet. Please try again later." }, 503);
  const limit = rateLimit(request, `workspace-invite-${actor}`, 10, 10 * 60_000);
  if (!limit.allowed) return workspaceJson({ error: "Please wait a few minutes before sending more invitations." }, 429);
  const token = randomBytes(32).toString("base64url");
  const response = await workspaceAction(db, actor, id, "invite", { email, role: body.role, token_hash: createHash("sha256").update(token).digest("hex") });
  if (!response.ok) return response;
  const invite = await response.json() as { invite_id: string };
  const { data: profile } = await db.from("profiles").select("username,full_name").eq("id", actor).maybeSingle();
  const owner = String(profile?.username || profile?.full_name?.split(" ")[0] || "Your roommate").replace(/[\r\n]/g, " ").slice(0, 80);
  // Never construct email links from untrusted request Host/Origin headers.
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || "https://dormscape.us").replace(/\/$/, "");
  const url = `${origin}/rooms/join#${token}`;
  const accepted = await sendEmail({ to: email, ...workspaceInvitationEmail({ owner, room: access.workspace.name, email, role: body.role, url }), idempotencyKey: `room-invite/${invite.invite_id}` });
  if (!accepted) {
    // Cancel only this attempt. Concurrent invitations to other people stay valid.
    await workspaceAction(db, actor, id, "revoke", { invite_id: invite.invite_id });
    return workspaceJson({ error: "The invitation email could not be sent. Please try again. If an earlier email arrives, request a fresh invitation." }, 502);
  }
  return workspaceJson({ sent: true, email, expires_in_days: 7 });
}
