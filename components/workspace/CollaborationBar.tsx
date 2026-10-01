"use client";
import { useEffect,useState } from "react";
import { usePlannerStore } from "@/lib/store";
import { collaboratorColor,presenceLabel,type RoomSection } from "@/lib/workspace-collaboration";
import type { WorkspaceDetail } from "@/lib/workspace";
import { useCollaboration } from "./CollaborationProvider";
import RoomVoice from "./RoomVoice";
import s from "./Collaboration.module.css";

export default function CollaborationBar({detail,userId,section,openComments,commentOn}: {detail:WorkspaceDetail;userId:string;section:RoomSection;openComments:()=>void;commentOn:(target:string)=>void}) {
  const live=useCollaboration(),[showPeople,setShowPeople]=useState(false);
  const view=usePlannerStore(state=>state.plannerView),selected=usePlannerStore(state=>state.selectedItemId);
  const update=live?.updateActivity;
  useEffect(()=>{update?.({section,view,selected});},[update,section,view,selected]);
  const enabled=detail.workspace.shared && detail.ownerPro;
  const online=Object.values(live?.peers??{}).filter(p=>p.active).length;
  const openCount=detail.comments.filter(c=>!c.parent_id&&!c.resolved).length;
  return <div className={s.bar}>
    <div className={s.presenceArea}>
      <button className={s.peopleButton} aria-expanded={showPeople} aria-controls="room-live-people" onClick={()=>setShowPeople(v=>!v)}>
        <span className={s.avatars}>{detail.members.map(m=><span key={m.user_id} className={s.avatar} data-online={live?.status==="live"&&!!live.peers[m.user_id]?.active} style={{"--person-color":collaboratorColor(m.user_id,detail.members.map(m=>m.user_id))} as React.CSSProperties}>{m.display_name.slice(0,2).toUpperCase()}<i/></span>)}</span>
        <span className={s.presenceText}><strong>{!enabled?"Your room":live?.status==="live"?`${online} here now`:live?.status==="connecting"?"Connecting roommates…":"Live connection unavailable"}</strong><small>{!enabled?"Invite roommates to plan together":live?.status==="live"?"A shared space. Your own point of view.":"Reconnect to see who's here"}</small></span><span aria-hidden="true">⌄</span>
      </button>
      {showPeople&&<div className={s.peoplePopover} id="room-live-people"><header><strong>In this room</strong><button onClick={()=>setShowPeople(false)} aria-label="Close people list">×</button></header>{detail.members.map(m=><div key={m.user_id}><span className={s.personDot} style={{background:collaboratorColor(m.user_id,detail.members.map(m=>m.user_id))}}/><span><strong>{m.display_name}{m.user_id===userId?" (you)":""}</strong><small>{presenceLabel(live?.peers[m.user_id],live?.status==="live")}</small></span><small>{m.role}</small></div>)}{enabled&&live?.status==="offline"&&<button className={s.retry} onClick={live.reconnect}>Reconnect live presence</button>}</div>}
    </div>
    <div className={s.barActions}>
      {selected&&section==="room"&&<button className={s.contextComment} onClick={()=>commentOn(`furniture:${selected}`)}>Comment on selected</button>}
      <button className={s.commentButton} onClick={openComments}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8m-8 4h5"/></svg>Comments{openCount>0&&<b>{openCount}</b>}</button>
      <RoomVoice id={detail.workspace.id} epoch={detail.workspace.realtime_epoch} members={detail.members} enabled={enabled} userId={userId}/>
    </div>
  </div>;
}
