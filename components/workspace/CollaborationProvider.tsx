"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase-browser";
import { readCursor, readPresence, type RoomActivity, type RoomCursor, type RoomPresence } from "@/lib/workspace-collaboration";

type LiveState = {
  status: "connecting" | "live" | "offline" | "disabled";
  peers: Record<string, RoomPresence>;
  cursors: Record<string, RoomCursor>;
  updateActivity: (activity: RoomActivity) => void;
  move: (surface: RoomCursor["surface"], x: number, y: number) => void;
  clear: () => void;
  reconnect: () => void;
};
const CollaborationContext = createContext<LiveState | null>(null);
export const useCollaboration = () => useContext(CollaborationContext);

export default function CollaborationProvider({id, epoch, enabled, userId, memberIds, onChange, children}: {
  id:string; epoch?:string; enabled:boolean; userId:string; memberIds:string[]; onChange:()=>Promise<void>; children:ReactNode;
}) {
  const [status,setStatus] = useState<LiveState["status"]>("connecting");
  const [peers,setPeers] = useState<LiveState["peers"]>({});
  const [cursors,setCursors] = useState<LiveState["cursors"]>({});
  const [attempt,setAttempt] = useState(0);
  const activity = useRef<RoomActivity>({section:"room",view:"2d",selected:null});
  const actions = useRef<{track:()=>void; send:(cursor:Omit<RoomCursor,"session"|"at">|null)=>void}>({track:()=>{},send:()=>{}});
  const changed = useRef(onChange); changed.current = onChange;
  const membership = [...memberIds].sort().join(",");
  useEffect(() => {
    setPeers({}); setCursors({});
    if (!enabled) { setStatus("disabled"); return; }
    const client = getBrowserClient();
    if (!client || !epoch) { setStatus("offline"); return; }
    setStatus("connecting");
    const session = crypto.randomUUID(), channels:RealtimeChannel[] = [], live = new Set<string>();
    let stopped=false, own:RealtimeChannel|undefined, lastActivity=Date.now(), lastTrack=0, lastSend=0;
    let flush:ReturnType<typeof setTimeout>|undefined, refreshTimer:ReturnType<typeof setTimeout>|undefined;
    let pending:Omit<RoomCursor,"session"|"at">|null=null;
    const send = (cursor:typeof pending) => {
      pending=cursor;
      clearTimeout(flush);
      const publish = () => {
        if (stopped || !own || !live.has(userId) || document.hidden) return;
        lastSend=Date.now();
        void own.send({type:"broadcast",event:"cursor",payload:pending ? {...pending,session,at:lastSend} : {session,clear:true}}).catch(()=>{});
      };
      if (cursor === null || Date.now()-lastSend >= 65) publish();
      else flush=setTimeout(publish,65-(Date.now()-lastSend));
    };
    const track = () => {
      if (stopped || !own || !live.has(userId)) return;
      lastTrack=Date.now();
      void own.track({...activity.current,session,active:!document.hidden && Date.now()-lastActivity<60_000,at:Date.now()}).catch(()=>{});
    };
    actions.current={track,send};
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(()=>{if(!stopped)void changed.current().catch(()=>{});},120);
    };
    const clearAll = () => {live.clear();setStatus("offline");setPeers({});setCursors({});};
    const active = () => {const wasAway=Date.now()-lastActivity>=60_000;lastActivity=Date.now();if(wasAway || Date.now()-lastTrack>15_000)track();};
    const visible = () => {if(document.hidden)send(null);else {lastActivity=Date.now();refresh();}track();};
    const start = async () => {
      try {
        const {data:{session:auth}}=await client.auth.getSession();
        if(stopped)return;
        if(!auth){clearAll();return;}
        await client.realtime.setAuth(auth.access_token);
        if(stopped)return;
        for (const uid of [...membership.split(","),"updates"]) {
          const channel=client.channel(`workspace:${id}:${epoch}:${uid}`,{config:{private:true,broadcast:{self:false},presence:{key:session}}});
          channels.push(channel);
          if(uid===userId)own=channel;
          if(uid==="updates") channel.on("broadcast",{event:"changed"},({payload})=>{
            if(stopped)return;
            // Stop outgoing ephemeral data while the server refreshes access.
            if(payload?.kind==="access") {live.delete(userId);setPeers({});setCursors({});setStatus("connecting");}
            refresh();
          });
          else {
            channel.on("presence",{event:"sync"},()=>{
              if(stopped)return;
              const sessions=Object.values(channel.presenceState()).flat().map(readPresence).filter((p):p is RoomPresence=>p!==null)
                .sort((a,b)=>Number(b.active)-Number(a.active)||b.at-a.at);
              setPeers(previous=>{const next={...previous};if(sessions[0])next[uid]=sessions[0];else delete next[uid];return next;});
              setCursors(previous=>{
                const cursor=previous[uid];if(!cursor || sessions.some(p=>p.session===cursor.session&&p.active))return previous;
                const next={...previous};delete next[uid];return next;
              });
            });
            if(uid!==userId)channel.on("broadcast",{event:"cursor"},({payload})=>{
              if(stopped)return;
              const cursor=readCursor(payload);
              if(!cursor && payload?.clear!==true)return;
              setCursors(previous=>{
                const next={...previous};
                if(cursor)next[uid]={...cursor,at:Date.now()};
                else if(next[uid]?.session===payload.session)delete next[uid];
                return next;
              });
            });
          }
          channel.subscribe(value=>{
            if(stopped)return;
            if(value==="SUBSCRIBED"){
              live.add(uid);if(uid===userId)track();
              if(live.size===channels.length && channels.length===membership.split(",").length+1)setStatus("live");
              if(uid==="updates")refresh();
            }else if(["CHANNEL_ERROR","TIMED_OUT","CLOSED"].includes(value)){
              live.delete(uid);setStatus("offline");setPeers({});setCursors({});
            }
          });
        }
      }catch{if(!stopped)clearAll();}
    };
    void start();
    const heartbeat=setInterval(track,15_000);
    const expire=setInterval(()=>setCursors(previous=>{
      const next=Object.fromEntries(Object.entries(previous).filter(([,c])=>Date.now()-c.at<4500));
      return Object.keys(next).length===Object.keys(previous).length?previous:next;
    }),1000);
    window.addEventListener("pointerdown",active);window.addEventListener("pointermove",active,{passive:true});window.addEventListener("keydown",active);
    window.addEventListener("offline",clearAll);document.addEventListener("visibilitychange",visible);
    return()=>{
      stopped=true;actions.current={track:()=>{},send:()=>{}};clearTimeout(flush);clearTimeout(refreshTimer);clearInterval(heartbeat);clearInterval(expire);
      window.removeEventListener("pointerdown",active);window.removeEventListener("pointermove",active);window.removeEventListener("keydown",active);
      window.removeEventListener("offline",clearAll);document.removeEventListener("visibilitychange",visible);
      channels.forEach(channel=>{void client.removeChannel(channel).catch(()=>{});});
    };
  },[id,epoch,enabled,userId,membership,attempt]);
  const updateActivity=useCallback((next:RoomActivity)=>{activity.current=next;actions.current.track();},[]);
  const move=useCallback((surface:string,x:number,y:number)=>actions.current.send({surface,x,y}),[]);
  const clear=useCallback(()=>actions.current.send(null),[]);
  const reconnect=useCallback(()=>setAttempt(n=>n+1),[]);
  return <CollaborationContext.Provider value={{status,peers,cursors,updateActivity,move,clear,reconnect}}>{children}</CollaborationContext.Provider>;
}
