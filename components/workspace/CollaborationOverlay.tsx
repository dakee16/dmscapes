"use client";
import { useEffect,useRef,type CSSProperties } from "react";
import { useCollaboration } from "./CollaborationProvider";
import { useWorkspace } from "./WorkspaceContext";
import { collaboratorColor } from "@/lib/workspace-collaboration";
import s from "./Collaboration.module.css";

export type CursorProjection={read:(x:number,y:number)=>{x:number;y:number}|null;draw:(x:number,y:number)=>{x:number;y:number}|null};
export default function CollaborationOverlay({surface,projection,pins=[],dynamic=false}: {surface:"plan"|"scene"|"shopping"|"roommates";projection?:CursorProjection;pins?:{id:string;label:string;x:number;y:number}[];dynamic?:boolean}) {
  const live=useCollaboration(),workspace=useWorkspace(),layer=useRef<HTMLDivElement>(null),transform=useRef(projection);
  transform.current=projection;
  const move=live?.move,clear=live?.clear;
  const hasVisiblePins=pins.some(pin=>workspace?.comments?.some(c=>c.target===`furniture:${pin.id}`&&!c.parent_id&&!c.resolved));
  useEffect(()=>{
    const parent=layer.current?.parentElement;if(!parent||!move||!clear)return;
    const pointer=(event:PointerEvent)=>{
      if(event.pointerType==="touch" || (event.target as HTMLElement).closest("input,textarea,select,[contenteditable],button,a")){clear();return;}
      const b=parent.getBoundingClientRect();if(!b.width||!b.height)return;
      const local={x:event.clientX-b.left,y:event.clientY-b.top};
      const p=transform.current?transform.current.read(local.x,local.y):{x:local.x/b.width,y:local.y/b.height};
      if(!p||p.x<0||p.x>1||p.y<0||p.y>1){clear();return;}
      move(surface,p.x,p.y);
    };
    parent.addEventListener("pointermove",pointer,{passive:true});parent.addEventListener("pointerleave",clear);
    return()=>{parent.removeEventListener("pointermove",pointer);parent.removeEventListener("pointerleave",clear);clear();};
  },[surface,move,clear]);
  useEffect(()=>{
    if(!dynamic)return;
    let frame=0;
    const update=()=>{
      layer.current?.querySelectorAll<HTMLElement>("[data-world-x]").forEach(el=>{
        const p=transform.current?.draw(Number(el.dataset.worldX),Number(el.dataset.worldY));
        el.style.visibility=p?"visible":"hidden";
        if(p){el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;}
      });
      frame=requestAnimationFrame(update);
    };
    if(Object.keys(live?.cursors??{}).length||hasVisiblePins)frame=requestAnimationFrame(update);
    return()=>cancelAnimationFrame(frame);
  },[dynamic,live?.cursors,hasVisiblePins]);
  if(!workspace)return null;
  const position=(x:number,y:number):CSSProperties=>{if(!projection)return {left:`${x*100}%`,top:`${y*100}%`};const p=projection.draw(x,y);return p?{left:p.x,top:p.y}:{visibility:"hidden"};};
  return <div ref={layer} className={s.cursorLayer}>
    {live?.status==="live"&&Object.entries(live.cursors).filter(([,cursor])=>cursor.surface===surface || (["plan","scene"].includes(surface)&&["plan","scene"].includes(cursor.surface))).map(([id,cursor])=>{
      const member=workspace.members.find(m=>m.user_id===id);if(!member||!live.peers[id]?.active)return null;
      return <div key={id} className={s.remoteCursor} data-world-x={cursor.x} data-world-y={cursor.y} style={{...position(cursor.x,cursor.y),"--person-color":collaboratorColor(id,workspace.members.map(m=>m.user_id))} as CSSProperties} aria-hidden="true"><svg width="23" height="28" viewBox="0 0 23 28"><path d="m2 2 18 13-9 2-4 8Z" fill="currentColor" stroke="white" strokeWidth="2"/></svg><span>{member.display_name}</span></div>;
    })}
    {pins.map(pin=>{
      const comments=workspace.comments?.filter(c=>c.target===`furniture:${pin.id}`&&!c.parent_id&&!c.resolved)??[];
      if(!comments.length)return null;
      return <button key={pin.id} className={s.commentPin} data-world-x={pin.x} data-world-y={pin.y} style={position(pin.x,pin.y)} aria-label={`${comments.length} open conversation${comments.length===1?"":"s"} on ${pin.label}`} title={`Comments on ${pin.label}`} onClick={e=>{e.stopPropagation();workspace.commentOn?.(`furniture:${pin.id}`);}}>{comments.length}</button>;
    })}
  </div>;
}
