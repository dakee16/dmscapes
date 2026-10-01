import { inviteRoommate } from "@/lib/workspace-invitation";
import { workspaceAccess, workspaceAction, workspaceBody, workspaceIdentity, workspaceJson, workspaceUnavailable, uuid } from "@/lib/workspace-server";
import { cleanWorkspaceSnapshot } from "@/lib/workspace-validation";
import { closeWorkspaceVoice } from "@/lib/workspace-voice";
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: Context) {
  const auth = await workspaceIdentity(request);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!uuid(id)) return workspaceJson({ error: "Room not found." }, 404);
  const access = await workspaceAccess(auth.db, id, auth.userId);
  if (access.response) return access.response;
  const [members, comments, versions, invitations] = await Promise.all([
    auth.db.from("workspace_members").select("user_id,role").eq("workspace_id", id).order("joined_at"),
    auth.db.from("workspace_comments").select("*").eq("workspace_id", id).order("created_at", { ascending: true }).limit(1000),
    auth.db.from("workspace_versions").select("id,revision,name,created_at").eq("workspace_id", id).order("created_at", { ascending: false }).limit(20),
    access.role === "owner" ? auth.db.from("workspace_invites").select("id,email,role,expires_at").eq("workspace_id", id).is("accepted_by", null).gt("expires_at", new Date().toISOString()).order("created_at") : Promise.resolve({ data: [], error: null }),
  ]);
  if (members.error || comments.error || versions.error || invitations.error) return workspaceUnavailable();
  const ids = [...new Set([...(members.data ?? []).map(m => m.user_id), ...(comments.data ?? []).map(c => c.user_id)])];
  const { data: profiles } = await auth.db.from("profiles").select("id,username,full_name").in("id", ids);
  const name = (uid: string) => profiles?.find(p => p.id === uid)?.username ?? profiles?.find(p => p.id === uid)?.full_name?.split(" ")[0] ?? "Roommate";
  return workspaceJson({ workspace: access.workspace, role: access.role, ownerPro: access.ownerPro,
    canEdit: access.role === "owner" || (access.role === "editor" && access.ownerPro && access.workspace.shared),
    members: members.data?.map(m => ({ ...m, display_name: name(m.user_id) })),
    comments: comments.data?.map(c => ({ id:c.id, user_id:c.user_id, body:c.body, target:c.target, resolved:c.resolved, created_at:c.created_at, parent_id:c.parent_id ?? null, display_name:name(c.user_id) })), versions: versions.data, invitations: invitations.data });
}

export async function PATCH(request: Request, context: Context) {
  const auth = await workspaceIdentity(request, true);
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!uuid(id)) return workspaceJson({ error: "Room not found." }, 404);
  const body = await workspaceBody(request);
  if (!body) return workspaceJson({ error: "Invalid request." }, 400);
  const { action } = body;
  let payload: Record<string, unknown> = {};
  if (action === "save") {
    const snapshot = cleanWorkspaceSnapshot(body.snapshot);
    if (!snapshot || !Number.isSafeInteger(body.revision) || Number(body.revision) < 1) return workspaceJson({ error: "The room couldn't be saved. Check its measurements and products." }, 400);
    payload = { snapshot, revision: body.revision };
  } else if (action === "checkpoint" || action === "restore") {
    if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1) return workspaceJson({ error: "Invalid room version." }, 400);
    if (action === "restore" && !uuid(body.version_id)) return workspaceJson({ error: "Invalid saved version." }, 400);
    if (action === "checkpoint" && (typeof body.name !== "string" || !body.name.trim() || body.name.length > 80)) return workspaceJson({ error: "Give this version a name, up to 80 characters." }, 400);
    payload = { revision: body.revision, ...(action === "restore" ? { version_id: body.version_id } : { name: String(body.name).trim() }) };
  } else if (action === "comment") {
    if (typeof body.body !== "string" || !body.body.trim() || body.body.length > 1500 || typeof body.target !== "string" || body.target.length > 120) return workspaceJson({ error: "Write a comment of up to 1,500 characters." }, 400);
    if (body.parent_id != null && !uuid(body.parent_id)) return workspaceJson({ error: "Invalid conversation." }, 400);
    if (!/^(room|(?:product|furniture|layout):[a-zA-Z0-9_.:-]{1,110})$/.test(body.target)) return workspaceJson({ error: "Choose a room, piece, or product to comment on." }, 400);
    payload = { body: body.body.trim(), target: body.target, parent_id: body.parent_id ?? null };
  } else if (action === "resolve") {
    if (!uuid(body.comment_id) || typeof body.resolved !== "boolean") return workspaceJson({ error: "Invalid comment." }, 400);
    payload = { comment_id: body.comment_id, resolved: body.resolved };
  } else if (action === "share") {
    if (typeof body.enabled !== "boolean") return workspaceJson({ error: "Invalid sharing setting." }, 400);
    payload = { enabled: body.enabled };
  } else if (action === "member") {
    if (!uuid(body.user_id) || !["editor", "commenter", "remove"].includes(String(body.role))) return workspaceJson({ error: "Invalid member role." }, 400);
    payload = { user_id: body.user_id, role: body.role };
  } else if (action === "invite") {
    return inviteRoommate(request, auth.db, auth.userId, id, body);
  } else if (action === "revoke") {
    if (body.invite_id != null && !uuid(body.invite_id)) return workspaceJson({ error: "Invalid invitation." }, 400);
    payload = body.invite_id ? { invite_id: body.invite_id } : {};
  } else if (!["revoke", "leave", "delete"].includes(String(action))) return workspaceJson({ error: "Unknown workspace action." }, 400);
  if (action === "member" || action === "delete" || action === "leave" || (action === "share" && body.enabled === false)) {
    const access = await workspaceAccess(auth.db, id, auth.userId);
    if (access.response) return access.response;
    if (access.role === "owner" || action === "leave") {
      // Close live media before revoking access. Never claim removal while a
      // previous voice connection can still hear the other room members.
      try { await closeWorkspaceVoice(id, access.workspace.realtime_epoch); }
      catch { return workspaceJson({ error: "Couldn't close the active voice room. Try this change again in a moment." }, 503); }
    }
  }
  return workspaceAction(auth.db, auth.userId, id, String(action), payload);
}
