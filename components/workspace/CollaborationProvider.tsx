"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase-browser";
import { readCursor, readPresence, type RoomActivity, type RoomCursor, type RoomPresence } from "@/lib/workspace-collaboration";

type LiveState = {
  status: "connecting" | "live" | "offline" | "disabled";
  peers: Record<string, RoomPresence>;
  cursors: Record<string, RoomCursor>;
  updateActivity: (activity: RoomActivity) => void;
  /** The pointer moved over `surface`; `read` gives its room position (null when outside the room) and is called when sending. */
  move: (surface: RoomCursor["surface"], read: () => { x: number; y: number } | null) => void;
  clear: () => void;
  reconnect: () => void;
  /** Cursor arrivals over the last few seconds, for the ?debug=cursors readout. */
  stats: () => { rate: number; p50: number; p95: number } | null;
};
const CollaborationContext = createContext<LiveState | null>(null);
// Development-only test relay (lib/fake-realtime.ts). The condition is false in production builds, so it's never bundled there.
const fakeRealtime: ((userId: string) => SupabaseClient) | null = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FAKE_REALTIME === "1"
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require("@/lib/fake-realtime").fakeRealtimeClient : null;
export const useCollaboration = () => useContext(CollaborationContext);

export default function CollaborationProvider({id, epoch, enabled, userId, memberIds, onChange, children}: {
  id:string; epoch?:string; enabled:boolean; userId:string; memberIds:string[]; onChange:()=>Promise<void>; children:ReactNode;
}) {
  const [status,setStatus] = useState<LiveState["status"]>("connecting");
  const [peers,setPeers] = useState<LiveState["peers"]>({});
  const [cursors,setCursors] = useState<LiveState["cursors"]>({});
  const [attempt,setAttempt] = useState(0);
  const activity = useRef<RoomActivity>({section:"room",view:"2d",selected:null});
  const actions = useRef<{track:()=>void; send:(surface:string,read:(()=>{x:number;y:number}|null)|null)=>void}>({track:()=>{},send:()=>{}});
  // Cursors go out only while someone else is here to see them (another member's tab is open and in front).
  const othersHere = useRef(false);
  othersHere.current = Object.entries(peers).some(([uid,p])=>uid!==userId && !p.hidden);
  const changed = useRef(onChange); changed.current = onChange;
  const arrivals = useRef<{at:number;lag:number}[]>([]);
  const membership = [...memberIds].sort().join(",");
  useEffect(() => {
    setPeers({}); setCursors({});
    if (!enabled) { setStatus("disabled"); return; }
    const client = fakeRealtime ? fakeRealtime(userId) : getBrowserClient();
    if (!client || !epoch) { setStatus("offline"); return; }
    setStatus("connecting");
    const session = crypto.randomUUID(), channels:RealtimeChannel[] = [], live = new Set<string>();
    let stopped=false, own:RealtimeChannel|undefined, lastActivity=Date.now(), lastTrack=0, lastSend=0, seq=0;
    const heard=new Map<string,number>();
    let flush:ReturnType<typeof setTimeout>|undefined, refreshTimer:ReturnType<typeof setTimeout>|undefined;
    // The pointer's latest position is read when a message goes out, so each message carries where it is now.
    let pending:(()=>{x:number;y:number}|null)|null=null, pendingSurface="", shown=false;
    const publish = () => {
      flush=undefined;
      if (stopped || !own || !live.has(userId) || document.hidden || !othersHere.current) return;
      const point=pending?.()??null;
      if (!point && !shown) return;
      lastSend=Date.now();shown=!!point;
      void own.send({type:"broadcast",event:"cursor",payload:point ? {...point,surface:pendingSurface,session,at:lastSend,seq:++seq} : {session,clear:true}}).catch(()=>{});
    };
    // About 25 updates a second while moving; 15 when two others are moving too (realtime quota).
    const send = (surface:string, read:typeof pending) => {
      pending=read;pendingSurface=surface;
      if (read && flush!==undefined) return;
      clearTimeout(flush);flush=undefined;
      const others=[...heard.values()].filter(at=>Date.now()-at<1000).length;
      const wait=read ? (others>=2 ? 66 : 40)-(Date.now()-lastSend) : 0;
      if (wait<=0) publish(); else flush=setTimeout(publish,wait);
    };
    const track = () => {
      if (stopped || !own || !live.has(userId)) return;
      lastTrack=Date.now();
      void own.track({...activity.current,session,active:!document.hidden && Date.now()-lastActivity<60_000,hidden:document.hidden,at:Date.now()}).catch(()=>{});
    };
    actions.current={track,send};
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(()=>{if(!stopped)void changed.current().catch(()=>{});},120);
    };
    const clearAll = () => {live.clear();setStatus("offline");setPeers({});setCursors({});};
    const active = () => {const wasAway=Date.now()-lastActivity>=60_000;lastActivity=Date.now();if(wasAway || Date.now()-lastTrack>15_000)track();};
    const visible = () => {if(document.hidden)send("",null);else {lastActivity=Date.now();refresh();}track();};
    const blur = () => send("",null);
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
              if(cursor){const now=Date.now();heard.set(uid,now);arrivals.current.push({at:now,lag:now-cursor.at});if(arrivals.current.length>300)arrivals.current.shift();}
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
    const expire=setInterval(()=>{
      // Keepalive: a still pointer over the canvas is resent every 2 s, so it stays on others' screens.
      if(pending && Date.now()-lastSend>=2000) publish();
      setCursors(previous=>{
      const next=Object.fromEntries(Object.entries(previous).filter(([,c])=>Date.now()-c.at<4500));
      return Object.keys(next).length===Object.keys(previous).length?previous:next;
    });},1000);
    window.addEventListener("pointerdown",active);window.addEventListener("pointermove",active,{passive:true});window.addEventListener("keydown",active);
    window.addEventListener("offline",clearAll);window.addEventListener("blur",blur);document.addEventListener("visibilitychange",visible);
    return()=>{
      stopped=true;actions.current={track:()=>{},send:()=>{}};clearTimeout(flush);clearTimeout(refreshTimer);clearInterval(heartbeat);clearInterval(expire);
      window.removeEventListener("pointerdown",active);window.removeEventListener("pointermove",active);window.removeEventListener("keydown",active);
      window.removeEventListener("offline",clearAll);window.removeEventListener("blur",blur);document.removeEventListener("visibilitychange",visible);
      channels.forEach(channel=>{void client.removeChannel(channel).catch(()=>{});});
    };
  },[id,epoch,enabled,userId,membership,attempt]);
  const updateActivity=useCallback((next:RoomActivity)=>{activity.current=next;actions.current.track();},[]);
  const move=useCallback((surface:string,read:()=>{x:number;y:number}|null)=>actions.current.send(surface,read),[]);
  const clear=useCallback(()=>actions.current.send("",null),[]);
  const reconnect=useCallback(()=>setAttempt(n=>n+1),[]);
  const stats=useCallback(()=>{
    const recent=arrivals.current.filter(a=>Date.now()-a.at<5000),lags=recent.map(a=>a.lag).sort((a,b)=>a-b);
    return lags.length?{rate:recent.length/5,p50:lags[Math.floor(lags.length*.5)],p95:lags[Math.min(lags.length-1,Math.floor(lags.length*.95))]}:null;
  },[]);
  return <CollaborationContext.Provider value={{status,peers,cursors,updateActivity,move,clear,reconnect,stats}}>{children}</CollaborationContext.Provider>;
}
