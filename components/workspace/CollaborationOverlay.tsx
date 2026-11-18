"use client";
import { useEffect,useLayoutEffect,useRef,type CSSProperties } from "react";
import { readPointTarget, type CursorPoint } from "@/lib/workspace-collaboration";
import { animate, useCollaboration, wake } from "./CollaborationProvider";
import { useWorkspace } from "./WorkspaceContext";
import { useVoice } from "./RoomVoice";
import { initial, personStyle } from "./people";
import s from "./Room.module.css";

/** `read`: a pixel in the overlay to a room point. `draw`: a room point (at height `h`, or on piece `id`) to a pixel, null when off screen. */
export type CursorProjection={read:(x:number,y:number)=>CursorPoint|null;draw:(x:number,y:number,h?:number,id?:string)=>{x:number;y:number}|null};
/** Live cursors and comment pins over the plan, the 3D scene or a list. Pins take
 * the colour of whoever spoke last in the thread; both layers follow the rail's switches. */
export default function CollaborationOverlay({surface,projection,pins=[],dynamic=false}: {surface:"plan"|"scene"|"shopping"|"roommates";projection?:CursorProjection;pins?:{id:string;label:string;x:number;y:number}[];dynamic?:boolean}) {
  const live=useCollaboration(),workspace=useWorkspace(),voice=useVoice(),layer=useRef<HTMLDivElement>(null),transform=useRef(projection);
  transform.current=projection;
  const move=live?.move,clear=live?.clear,sample=live?.sample;
  const showPins=workspace?.overlay?.pins!==false,showCursors=workspace?.overlay?.cursors!==false;
  useEffect(()=>{
    const parent=layer.current?.parentElement;if(!parent||!move||!clear)return;
    let last={x:NaN,y:NaN};
    const leave=()=>{last={x:NaN,y:NaN};clear();};
    const pointer=(event:PointerEvent)=>{
      if(event.pointerType==="touch" || (event.target as HTMLElement).closest("input,textarea,select,[contenteditable],button,a")){leave();return;}
      const b=parent.getBoundingClientRect();if(!b.width||!b.height)return;
      const local={x:event.clientX-b.left,y:event.clientY-b.top};
      // Moves under half a pixel aren't worth a message.
      if(Math.hypot(local.x-last.x,local.y-last.y)<.5)return;
      last=local;
      move(surface,()=>{const p=transform.current?transform.current.read(local.x,local.y):{x:local.x/b.width,y:local.y/b.height};return p&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1?p:null;});
    };
    parent.addEventListener("pointermove",pointer,{passive:true});parent.addEventListener("pointerleave",leave);
    return()=>{parent.removeEventListener("pointermove",pointer);parent.removeEventListener("pointerleave",leave);clear();};
  },[surface,move,clear]);
  // Cursors glide on the shared animation loop (no React render per message). In 3D, pins follow the camera too.
  useEffect(()=>{
    if(!sample)return;
    return animate(()=>{
      const el=layer.current;if(!el)return false;
      let more=false;const now=Date.now();
      el.querySelectorAll<HTMLElement>("[data-cursor]").forEach(cursor=>{
        const p=sample(cursor.dataset.cursor!,now),q=p&&(transform.current?transform.current.draw(p.x,p.y,p.h,p.id):{x:p.x*el.clientWidth,y:p.y*el.clientHeight});
        cursor.style.visibility=q?"":"hidden";
        if(q)cursor.style.transform=`translate3d(${q.x}px,${q.y}px,0)`;
        if(p&&!p.settled)more=true;
      });
      if(dynamic)el.querySelectorAll<HTMLElement>("[data-world-x]").forEach(pin=>{
        const q=transform.current?.draw(Number(pin.dataset.worldX),Number(pin.dataset.worldY),pin.dataset.worldH?Number(pin.dataset.worldH):undefined,pin.dataset.worldId);
        pin.style.visibility=q?"visible":"hidden";
        if(q){pin.style.left=`${q.x}px`;pin.style.top=`${q.y}px`;}
      });
      return more;
    });
  },[sample,dynamic]);
  // Redraw before paint whenever React changes the layer (a cursor appears, the 2D plan pans or zooms).
  useLayoutEffect(()=>{wake(true);});
  if(!workspace)return null;
  const position=(x:number,y:number,h?:number):CSSProperties=>{if(!projection)return {left:`${x*100}%`,top:`${y*100}%`};const p=projection.draw(x,y,h);return p?{left:p.x,top:p.y}:{visibility:"hidden"};};
  // On the plan and in 3D: spot comments get pins too, and the spot the comments panel is on gets a soft ring.
  const room=surface==="plan"||surface==="scene",spots=room&&showPins?workspace.spots??[]:[];
  const rings=room?(workspace.marks??[]).flatMap(m=>{const p=readPointTarget(m.target);return p?[{...p,color:m.color,target:m.target}]:[];}):[];
  const pin=(key:string,target:string,label:string,x:number,y:number,h?:number)=>{
    const comments=workspace.comments?.filter(c=>c.target===target&&!c.parent_id&&!c.resolved)??[];
    if(!comments.length)return null;
    const threads=new Set(comments.map(c=>c.id));
    const latest=(workspace.comments??[]).filter(c=>threads.has(c.id)||(c.parent_id&&threads.has(c.parent_id))).sort((a,b)=>b.created_at.localeCompare(a.created_at))[0];
    const author=workspace.members.find(m=>m.user_id===latest?.user_id);
    return <button key={key} type="button" className={s.commentPin} data-world-x={x} data-world-y={y} data-world-h={h} style={{...position(x,y,h),...(latest?personStyle(latest.user_id,workspace.members):{})}} aria-label={`${comments.length} open conversation${comments.length===1?"":"s"} on ${label}${latest?`, latest from ${latest.display_name}`:""}`} title={`Comments on ${label}`} onClick={e=>{e.stopPropagation();workspace.commentOn?.(target);}}><span aria-hidden="true">{initial(author?.display_name??latest?.display_name??"?")}</span>{comments.length}</button>;
  };
  return <div ref={layer} className={s.cursorLayer}>
    {showCursors&&live?.status==="live"&&Object.entries(live.cursors).filter(([,cursor])=>cursor.surface===surface || (["plan","scene"].includes(surface)&&["plan","scene"].includes(cursor.surface))).map(([id])=>{
      const member=workspace.members.find(m=>m.user_id===id);if(!member||!live.peers[id]?.active)return null;
      const talking=voice?.participants.some(p=>p.id===id&&p.speaking&&!p.muted);
      return <div key={id} className={s.remoteCursor} data-cursor={id} style={personStyle(id,workspace.members)} aria-hidden="true"><svg width="22" height="22" viewBox="0 0 24 24"><path d="M3 2l7 19 3-8 8-3z" fill="currentColor" stroke="white" strokeWidth="1.6" strokeLinejoin="round"/></svg><span>{member.display_name}{talking&&<i className={s.cursorBars}><b/><b/><b/></i>}</span></div>;
    })}
    {rings.map(r=><span key={r.target} className={s.spotRing} data-ring={r.target} data-world-x={r.x} data-world-y={r.y} data-world-h={r.h} style={{...position(r.x,r.y,r.h),"--person":r.color} as CSSProperties} aria-hidden="true"/>)}
    {showPins&&pins.map(p=>pin(p.id,`furniture:${p.id}`,p.label,p.x,p.y))}
    {spots.map(p=>pin(p.target,p.target,p.label,p.x,p.y,p.h))}
  </div>;
}
