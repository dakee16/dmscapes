import { workspaceBody, workspaceIdentity, workspaceAction, workspaceJson, workspaceUnavailable } from "@/lib/workspace-server";
import { cleanWorkspaceSnapshot } from "@/lib/workspace-validation";

export async function GET(request: Request) {
  const auth = await workspaceIdentity(request);
  if (auth.response) return auth.response;
  const { db, userId } = auth;
  const { data: memberships, error } = await db.from("workspace_members").select("workspace_id,role").eq("user_id", userId);
  if (error) return workspaceUnavailable();
  if (!memberships?.length) return workspaceJson({ rooms: [] });
  const ids = memberships.map(m => m.workspace_id);
  const [rooms, members] = await Promise.all([
    db.from("room_workspaces").select("*").in("id", ids).order("updated_at", { ascending: false }).limit(100),
    db.from("workspace_members").select("workspace_id").in("workspace_id", ids),
  ]);
  if (rooms.error || members.error) return workspaceUnavailable();
  return workspaceJson({ rooms: (rooms.data ?? []).map(r => ({ ...r, role: memberships.find(m => m.workspace_id === r.id)?.role,
    member_count: members.data?.filter(m => m.workspace_id === r.id).length ?? 1 })) });
}

export async function POST(request: Request) {
  const auth = await workspaceIdentity(request, true);
  if (auth.response) return auth.response;
  const body = await workspaceBody(request);
  if (!body) return workspaceJson({ error: "That room is too large or isn't valid." }, 400);
  let raw = body.snapshot;
  let source: string | null = null;
  if (body.source_room_id != null) {
    if (typeof body.source_room_id !== "string" || !/^[\w-]{1,100}$/.test(body.source_room_id)) return workspaceJson({ error: "Invalid saved room." }, 400);
    source = body.source_room_id;
    const { data } = await auth.db.from("saved_rooms").select("*").eq("id", source).eq("user_id", auth.userId).maybeSingle();
    if (!data) return workspaceJson({ error: "That saved room is not in your account." }, 404);
    raw = data;
  }
  const snapshot = cleanWorkspaceSnapshot(raw);
  if (!snapshot) return workspaceJson({ error: "Couldn't open this room. Its saved measurements or products need attention." }, 400);
  return workspaceAction(auth.db, auth.userId, null, "create", { snapshot, name: snapshot.name, source_room_id: source });
}
