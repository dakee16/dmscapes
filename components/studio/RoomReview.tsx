"use client";
import { useEffect, useMemo, useState } from "react";
import type { FurnitureItem, Product, SelectedRoom } from "@/lib/types";
import type { PlanningDetails } from "@/lib/planning";
import { analyzeRoom, assignedCosts, ownerName, supplyFor } from "@/lib/planning";
import { useAuth } from "@/lib/auth-context";
import { getBrowserClient } from "@/lib/supabase-browser";
import { MiniPlan } from "./PlanningPanels";
import s from "./Review.module.css";
interface Comment {id:string;display_name:string;body:string;alternative_id:string|null;created_at:string}
export default function RoomReview({id,room,items,products,planning}:{id:string;room:SelectedRoom;items:FurnitureItem[];products:Product[];planning:PlanningDetails}){
  const [alternative,setAlternative]=useState(""),[comments,setComments]=useState<Comment[]>([]),[error,setError]=useState(""),[name,setName]=useState(""),[body,setBody]=useState(""),[busy,setBusy]=useState(false);
  const {user,openAuthModal}=useAuth(),selected=planning.alternatives.find(a=>a.id===alternative),visible=selected?.furniture??items,analysis=useMemo(()=>analyzeRoom(visible,room,planning.walkwayFt),[visible,room,planning.walkwayFt]),costs=assignedCosts(visible,products,planning);
  useEffect(()=>{const controller=new AbortController();fetch(`/api/rooms/${id}/comments`,{signal:controller.signal}).then(async r=>{const data=await r.json();if(!r.ok)throw Error(data.error);setComments(data.comments);}).catch(e=>{if(e.name!=="AbortError")setError(e.message||"Could not load comments.");});return()=>controller.abort();},[id]);
  async function post(e:React.FormEvent){e.preventDefault();if(!user){openAuthModal("profile");return;}if(busy)return;setBusy(true);setError("");try{const token=(await getBrowserClient()?.auth.getSession())?.data.session?.access_token;if(!token)throw Error("Sign in again to comment. Your draft is still here.");const res=await fetch(`/api/rooms/${id}/comments`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({displayName:name,body,alternativeId:alternative||null})});const data=await res.json();if(!res.ok)throw Error(data.error);setComments(c=>[...c,data.comment]);setBody("");}catch(e){setError(e instanceof Error?e.message:"Could not post your comment.");}finally{setBusy(false);}}
  return <section className={s.review} aria-labelledby="room-review-heading"><div className={s.heading}><p>Plan together</p><h2 id="room-review-heading">Roommate review.</h2><span>A saved snapshot. Comments do not change the room.</span></div><div className={s.columns}><div>
    <label className={s.field}>Review an arrangement<select value={alternative} onChange={e=>setAlternative(e.target.value)}><option value="">Current arrangement</option>{planning.alternatives.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select></label>
    <MiniPlan room={room} items={visible}/><p className={s.metric}>≈ {Math.round(analysis.openFloorFt2)} ft² open · {analysis.beds} sleeping places · {analysis.issues.filter(i=>i.level==="warning").length} checks</p>
    <details><summary>Who brings what</summary><ul>{visible.map(f=><li key={f.id}><strong>{f.label}</strong><span>{ownerName(f.assigned_to,planning.roommates)} · {supplyFor(f)==="owned"?"Bring":supplyFor(f)==="school"?"School provided":"To buy"}</span></li>)}</ul></details>
    <dl className={s.costs}>{[...planning.roommates,{id:"shared",name:"Shared"}].map(r=><div key={r.id}><dt>{r.name}</dt><dd>${(costs[r.id]??0).toFixed(2)}</dd></div>)}</dl>
  </div><div><h3>Comments</h3><p className={s.caption}>Anyone with this room link can read these notes. Keep private details out.</p><ol className={s.comments}>{comments.map(c=><li key={c.id}><strong>{c.display_name}</strong><small>{c.alternative_id?planning.alternatives.find(a=>a.id===c.alternative_id)?.name??"Alternative":"Current arrangement"}</small><p>{c.body}</p></li>)}</ol>{!comments.length&&!error&&<p className={s.caption}>No comments yet. Start with what works and what you would change.</p>}
    <form onSubmit={post}><label className={s.field}>Your display name<input maxLength={40} required value={name} onChange={e=>setName(e.target.value)}/></label><label className={s.field}>Comment on {selected?.name??"the current arrangement"}<textarea required maxLength={1200} rows={4} value={body} onChange={e=>setBody(e.target.value)}/></label><button disabled={busy}>{busy?"Posting…":user?"Post comment":"Sign in to comment"}</button></form>{error&&<p className={s.error} role="status">{error}</p>}
  </div></div></section>;
}
