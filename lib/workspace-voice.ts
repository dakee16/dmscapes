// Imported only by authenticated server routes. Never expose the LiveKit secret.
import { AccessToken, RoomServiceClient, TrackSource } from "livekit-server-sdk";
export function voiceConfiguration() {
  const url=process.env.LIVEKIT_URL, key=process.env.LIVEKIT_API_KEY, secret=process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret) return null;
  try { if(new URL(url).protocol!=="wss:")return null; } catch { return null; }
  return {url,key,secret};
}
export const voiceRoomName=(id:string,epoch:string)=>`dormscape-${id}-${epoch}`;
export async function closeWorkspaceVoice(id:string,epoch?:string) {
  const config=voiceConfiguration();if(!config || !epoch)return;
  const service=new RoomServiceClient(config.url.replace(/^wss:/,"https:"),config.key,config.secret,{requestTimeout:8});
  try {await service.deleteRoom(voiceRoomName(id,epoch));}
  catch(error) {if((error as {code?:string;status?:number}).code!=="not_found" && (error as {status?:number}).status!==404)throw error;}
}
export async function workspaceVoiceToken(id:string,epoch:string,userId:string,name:string) {
  const config=voiceConfiguration();if(!config)return null;
  const room=voiceRoomName(id,epoch);
  const service=new RoomServiceClient(config.url.replace(/^wss:/,"https:"),config.key,config.secret,{requestTimeout:8});
  await service.createRoom({name:room,maxParticipants:4,emptyTimeout:60,departureTimeout:20});
  const token=new AccessToken(config.key,config.secret,{identity:userId,name:name.slice(0,60),ttl:"2m"});
  token.addGrant({room,roomJoin:true,canSubscribe:true,canPublish:true,canPublishData:false,canPublishSources:[TrackSource.MICROPHONE]});
  return {url:config.url,token:await token.toJwt()};
}
