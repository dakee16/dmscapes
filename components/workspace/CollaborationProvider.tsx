"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { getBrowserClient } from "@/lib/supabase-browser";
import { readCursor, readPing, readPresence, type CursorPoint, type RoomActivity, type RoomCursor, type RoomPresence } from "@/lib/workspace-collaboration";

/**
 * A remote cursor's last few positions, on the sender's clock (`sent`). It's played back about `delay` ms in the past
 * (a typical gap between messages plus the network's jitter), so the next position has usually arrived. `at` is the
 * playback time: it eases to a stop when messages run late and speeds up (up to 2×) to catch up, so there's no stepping.
 */
type Track = { surface: string; session: string; samples: (CursorPoint & { sent: number })[]; late: number[]; gaps: number[]; delay: number; at: number; frame: number; last: number };
type LiveState = {
  status: "connecting" | "live" | "offline" | "disabled";
  peers: Record<string, RoomPresence>;
  /** Who has a cursor out, and on which surface. Positions come from `sample`, not React state. */
  cursors: Record<string, { surface: string; session: string }>;
  /** Where to draw someone's cursor at `now`: interpolated between their last positions. `settled` once it has stopped. */
  sample: (userId: string, now: number) => (CursorPoint & { settled: boolean }) | null;
  updateActivity: (activity: RoomActivity) => void;
  /** The pointer moved over `surface`; `read` gives its room position (null when outside the room) and is called when sending. */
  move: (surface: RoomCursor["surface"], read: () => CursorPoint | null) => void;
  clear: () => void;
  reconnect: () => void;
  /** Cursor arrivals over the last few seconds, for the ?debug=cursors readout. */
  stats: () => { rate: number; p50: number; p95: number; delay: number } | null;
  /** "Look here" pings, yours and others': shown for 3 s (`done` after), kept 10 s for the "Show" notice. */
  pings: Ping[];
  /** Owners and editors can ping; commenters can't. */
  canPing: boolean;
  ping: (point: CursorPoint) => void;
  /** An overlay drew this ping off screen, so the room bar offers to show it. */
  offscreen: (key: string) => void;
};
export type Ping = CursorPoint & { key: string; userId: string; at: number; done?: boolean; offscreen?: boolean };
// One animation loop for every overlay (cursors, pins in 3D, pings). It stops when no job needs another frame.
const jobs = new Set<() => boolean>();
let frame = 0;
function tick() { frame = 0; let more = false; for (const job of jobs) if (job()) more = true; if (more && !frame) frame = requestAnimationFrame(tick); }
/** Run the overlays on the next frame, or right now when called from another frame callback (the 3D scene's). */
export function wake(now = false) { if (!jobs.size) return; if (now) { cancelAnimationFrame(frame); tick(); } else if (!frame) frame = requestAnimationFrame(tick); }
export function animate(job: () => boolean) { jobs.add(job); wake(); return () => { jobs.delete(job); }; }
const CollaborationContext = createContext<LiveState | null>(null);
// Development-only test relay (lib/fake-realtime.ts). The condition is false in production builds, so it's never bundled there.
const fakeRealtime: ((userId: string) => SupabaseClient) | null = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_FAKE_REALTIME === "1"
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  ? require("@/lib/fake-realtime").fakeRealtimeClient : null;
export const useCollaboration = () => useContext(CollaborationContext);

export default function CollaborationProvider({id, epoch, enabled, userId, memberIds, editorIds, onChange, children}: {
  id:string; epoch?:string; enabled:boolean; userId:string; memberIds:string[];
  /** The owner and editors: the only members whose pings are shown (a member can only publish as themselves). */
  editorIds:string[]; onChange:()=>Promise<void>; children:ReactNode;
}) {
  const [status,setStatus] = useState<LiveState["status"]>("connecting");
  const [peers,setPeers] = useState<LiveState["peers"]>({});
  const [cursors,setCursors] = useState<LiveState["cursors"]>({});
  const [attempt,setAttempt] = useState(0);
  const [pings,setPings] = useState<Ping[]>([]);
  const editors = useRef(editorIds); editors.current = editorIds;
  const activity = useRef<RoomActivity>({section:"room",view:"2d",selected:null});
  const actions = useRef<{track:()=>void; send:(surface:string,read:(()=>CursorPoint|null)|null)=>void; ping:(point:CursorPoint)=>void}>({track:()=>{},send:()=>{},ping:()=>{}});
  const tracks = useRef(new Map<string,Track>());
  // Cursors go out only while someone else is here to see them (another member's tab is open and in front).
  const othersHere = useRef(false);
  othersHere.current = Object.entries(peers).some(([uid,p])=>uid!==userId && !p.hidden);
  const changed = useRef(onChange); changed.current = onChange;
  const arrivals = useRef<{at:number;lag:number}[]>([]);
  const membership = [...memberIds].sort().join(",");
  useEffect(() => {
    setPeers({}); setCursors({}); tracks.current.clear(); setPings([]);
    if (!enabled) { setStatus("disabled"); return; }
    const client = fakeRealtime ? fakeRealtime(userId) : getBrowserClient();
    if (!client || !epoch) { setStatus("offline"); return; }
    setStatus("connecting");
    const session = crypto.randomUUID(), channels:RealtimeChannel[] = [], live = new Set<string>();
    let stopped=false, own:RealtimeChannel|undefined, lastActivity=Date.now(), lastTrack=0, lastSend=0, seq=0;
    const heard=new Map<string,number>(),pinged=new Map<string,number>(),timers=new Set<ReturnType<typeof setTimeout>>();
    let pingSeq=0;
    const later=(fn:()=>void,ms:number)=>{const t=setTimeout(()=>{timers.delete(t);if(!stopped)fn();},ms);timers.add(t);};
    const show=(ping:Ping)=>{
      setPings(previous=>[...previous.filter(p=>p.userId!==ping.userId),ping]);
      later(()=>setPings(previous=>previous.map(p=>p.key===ping.key?{...p,done:true}:p)),3000);
      later(()=>setPings(previous=>previous.filter(p=>p.key!==ping.key)),10_000);
    };
    // "Look here": sent on your own channel, shown to you at once. Nothing is saved.
    const ping=(point:CursorPoint)=>{
      if(stopped || !own || !live.has(userId) || !editors.current.includes(userId))return;
      const at=Date.now();
      void own.send({type:"broadcast",event:"ping",payload:{...point,session,at,seq:++pingSeq}}).catch(()=>{});
      show({...point,key:`${userId}:${pingSeq}`,userId,at});
    };
    let flush:ReturnType<typeof setTimeout>|undefined, refreshTimer:ReturnType<typeof setTimeout>|undefined;
    // The pointer's latest position is read when a message goes out, so each message carries where it is now.
    let pending:(()=>CursorPoint|null)|null=null, pendingSurface="", shown=false;
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
    actions.current={track,send,ping};
    const refresh = () => {
      clearTimeout(refreshTimer);
      refreshTimer=setTimeout(()=>{if(!stopped)void changed.current().catch(()=>{});},120);
    };
    const forget = () => {tracks.current.clear();setCursors({});};
    const drop = (uid:string) => {if(!tracks.current.delete(uid))return;setCursors(previous=>{const next={...previous};delete next[uid];return next;});};
    const clearAll = () => {live.clear();setStatus("offline");setPeers({});forget();};
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
            if(payload?.kind==="access") {live.delete(userId);setPeers({});forget();setStatus("connecting");}
            refresh();
          });
          else {
            channel.on("presence",{event:"sync"},()=>{
              if(stopped)return;
              const sessions=Object.values(channel.presenceState()).flat().map(readPresence).filter((p):p is RoomPresence=>p!==null)
                .sort((a,b)=>Number(b.active)-Number(a.active)||b.at-a.at);
              setPeers(previous=>{const next={...previous};if(sessions[0])next[uid]=sessions[0];else delete next[uid];return next;});
              const track=tracks.current.get(uid);
              if(track && !sessions.some(p=>p.session===track.session&&p.active))drop(uid);
            });
            // Only an owner's or editor's ping counts (the channel guarantees who sent it), one per 1.5 s each, none older than 5 s.
            if(uid!==userId)channel.on("broadcast",{event:"ping"},({payload})=>{
              const ping=readPing(payload),now=Date.now();
              if(stopped || !ping || !editors.current.includes(uid) || now-ping.at>5000 || now-(pinged.get(uid)??0)<1500)return;
              pinged.set(uid,now);
              show({x:ping.x,y:ping.y,...(ping.h!==undefined?{h:ping.h}:{}),...(ping.id?{id:ping.id}:{}),key:`${uid}:${ping.session}:${ping.seq}`,userId:uid,at:now});
            });
            if(uid!==userId)channel.on("broadcast",{event:"cursor"},({payload})=>{
              if(stopped)return;
              const cursor=readCursor(payload),now=Date.now();
              if(!cursor){if(payload?.clear===true && tracks.current.get(uid)?.session===payload.session)drop(uid);return;}
              heard.set(uid,now);arrivals.current.push({at:now,lag:now-cursor.at});if(arrivals.current.length>300)arrivals.current.shift();
              let track=tracks.current.get(uid);
              if(!track || track.session!==cursor.session || track.surface!==cursor.surface){
                track={surface:cursor.surface,session:cursor.session,samples:[],late:[],gaps:[],delay:60,at:0,frame:0,last:now};tracks.current.set(uid,track);
                setCursors(previous=>({...previous,[uid]:{surface:cursor.surface,session:cursor.session}}));
              }
              const previous=track.samples.at(-1),gap=previous?cursor.at-previous.sent:Infinity;
              if(gap<=0)return;
              // Snap rather than glide after a pause or a jump across a quarter of the room.
              if(gap>300 || (previous && Math.hypot(cursor.x-previous.x,cursor.y-previous.y)>.25)){track.samples=[];track.at=cursor.at;}
              else {track.gaps.push(gap);if(track.gaps.length>10)track.gaps.shift();}
              track.samples.push({x:cursor.x,y:cursor.y,h:cursor.h,id:cursor.id,sent:cursor.at});if(track.samples.length>4)track.samples.shift();
              track.late.push(now-cursor.at);if(track.late.length>32)track.late.shift();
              const late=[...track.late].sort((a,b)=>a-b),gaps=[...track.gaps].sort((a,b)=>a-b);
              track.delay=Math.min(150,Math.max(40,(gaps[gaps.length>>1]??40)+late[Math.floor(late.length*.9)]-late[0]+15));
              track.last=now;wake();
            });
          }
          channel.subscribe(value=>{
            if(stopped)return;
            if(value==="SUBSCRIBED"){
              live.add(uid);if(uid===userId)track();
              if(live.size===channels.length && channels.length===membership.split(",").length+1)setStatus("live");
              if(uid==="updates")refresh();
            }else if(["CHANNEL_ERROR","TIMED_OUT","CLOSED"].includes(value)){
              live.delete(uid);setStatus("offline");setPeers({});forget();
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
      // A cursor with no message for 10 s is gone (a still one is kept alive by the keepalive).
      for(const [uid,track] of tracks.current)if(Date.now()-track.last>10_000)drop(uid);
    },1000);
    window.addEventListener("pointerdown",active);window.addEventListener("pointermove",active,{passive:true});window.addEventListener("keydown",active);
    window.addEventListener("offline",clearAll);window.addEventListener("blur",blur);document.addEventListener("visibilitychange",visible);
    return()=>{
      stopped=true;actions.current={track:()=>{},send:()=>{},ping:()=>{}};timers.forEach(clearTimeout);clearTimeout(flush);clearTimeout(refreshTimer);clearInterval(heartbeat);clearInterval(expire);
      window.removeEventListener("pointerdown",active);window.removeEventListener("pointermove",active);window.removeEventListener("keydown",active);
      window.removeEventListener("offline",clearAll);window.removeEventListener("blur",blur);document.removeEventListener("visibilitychange",visible);
      channels.forEach(channel=>{void client.removeChannel(channel).catch(()=>{});});
    };
  },[id,epoch,enabled,userId,membership,attempt]);
  const updateActivity=useCallback((next:RoomActivity)=>{activity.current=next;actions.current.track();},[]);
  const move=useCallback((surface:string,read:()=>CursorPoint|null)=>actions.current.send(surface,read),[]);
  const sample=useCallback((uid:string,now:number)=>{
    const track=tracks.current.get(uid),s=track?.samples;if(!track||!s?.length)return null;
    const newest=s[s.length-1].sent,goal=now-track.delay-Math.min(...track.late),dt=track.frame?Math.min(100,Math.max(0,now-track.frame)):0;
    track.frame=now;
    track.at=Math.min(newest,track.at+dt*Math.max(0,Math.min(2,1+(goal-track.at)/120))*Math.min(1,(newest-track.at)/15));
    const at=track.at;
    let i=s.length-1;while(i>0&&s[i].sent>at)i--;
    const a=s[i],b=s[i+1];
    if(!b||at<=a.sent)return {...a,settled:!b&&at>=a.sent-.5};
    const k=(at-a.sent)/(b.sent-a.sent);
    return {x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,h:a.h!==undefined&&b.h!==undefined?a.h+(b.h-a.h)*k:b.h,id:k<.5?a.id:b.id,settled:false};
  },[]);
  const clear=useCallback(()=>actions.current.send("",null),[]);
  const reconnect=useCallback(()=>setAttempt(n=>n+1),[]);
  const ping=useCallback((point:CursorPoint)=>actions.current.ping(point),[]);
  const offscreen=useCallback((key:string)=>setPings(previous=>previous.some(p=>p.key===key&&!p.offscreen)?previous.map(p=>p.key===key?{...p,offscreen:true}:p):previous),[]);
  const stats=useCallback(()=>{
    const recent=arrivals.current.filter(a=>Date.now()-a.at<5000),lags=recent.map(a=>a.lag).sort((a,b)=>a-b);
    const delays=[...tracks.current.values()].map(t=>t.delay);
    return lags.length?{rate:recent.length/5,p50:lags[Math.floor(lags.length*.5)],p95:lags[Math.min(lags.length-1,Math.floor(lags.length*.95))],delay:Math.round(delays.length?Math.max(...delays):0)}:null;
  },[]);
  return <CollaborationContext.Provider value={{status,peers,cursors,sample,updateActivity,move,clear,reconnect,stats,pings,canPing:editorIds.includes(userId),ping,offscreen}}>{children}</CollaborationContext.Provider>;
}
