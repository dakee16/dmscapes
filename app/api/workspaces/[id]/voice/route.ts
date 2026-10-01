import { workspaceAccess,workspaceIdentity,workspaceJson,uuid } from "@/lib/workspace-server";
import { closeWorkspaceVoice,voiceConfiguration,workspaceVoiceToken } from "@/lib/workspace-voice";
import { rateLimit } from "@/lib/rate-limit";
export const runtime="nodejs";
type Context={params:Promise<{id:string}>};
async function access(request:Request,context:Context) {
  const auth=await workspaceIdentity(request);if(auth.response)return {response:auth.response};
  const {id}=await context.params;if(!uuid(id))return {response:workspaceJson({error:"Room not found."},404)};
  const room=await workspaceAccess(auth.db,id,auth.userId);if(room.response)return {response:room.response};
  if(!room.workspace.shared || !room.ownerPro)return {response:workspaceJson({error:"Voice is available in a Pro host's shared room."},403)};
  return {auth,room,id};
}
export async function GET(request:Request,context:Context) {
  const result=await access(request,context);if(result.response)return result.response;
  return workspaceJson({available:!!voiceConfiguration() && !!result.room!.workspace.realtime_epoch});
}
export async function POST(request:Request,context:Context) {
  const result=await access(request,context);if(result.response)return result.response;
  const {auth,room,id}=result;
  const limit=rateLimit(request,`workspace-voice-${auth!.userId}`,8,60_000);
  if(!limit.allowed)return workspaceJson({error:"Give it a moment before joining again."},429);
  if(!voiceConfiguration() || !room!.workspace.realtime_epoch)return workspaceJson({error:"Room voice isn't enabled in this environment yet. You can still leave a comment."},503);
  const {data:profile}=await auth!.db.from("profiles").select("username,full_name").eq("id",auth!.userId).maybeSingle();
  const name=profile?.username || profile?.full_name?.split(" ")[0] || "Roommate";
  try {
    const token=await workspaceVoiceToken(id!,room!.workspace.realtime_epoch,auth!.userId,name);
    const current=await workspaceAccess(auth!.db,id!,auth!.userId);
    if(current.response || !current.workspace.shared || !current.ownerPro || current.workspace.realtime_epoch!==room!.workspace.realtime_epoch) {
      await closeWorkspaceVoice(id!,room!.workspace.realtime_epoch);
      return workspaceJson({error:"Room access changed. Refresh before joining voice."},403);
    }
    return workspaceJson(token);
  }catch {return workspaceJson({error:"Couldn't open room voice. Try again in a moment."},503);}
}
