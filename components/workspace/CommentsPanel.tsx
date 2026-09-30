"use client";
import { useEffect,useRef,useState } from "react";
import Modal from "@/components/site/Modal";
import { collaboratorColor } from "@/lib/workspace-collaboration";
import type { WorkspaceComment,WorkspaceRole } from "@/lib/workspace";
import { useWorkspace } from "./WorkspaceContext";
import s from "./Collaboration.module.css";

export default function CommentsPanel({open,onClose,comments,userId,role,allowed,target,setTarget,targets,onLocate,action}:{
  open:boolean;onClose:()=>void;comments:WorkspaceComment[];userId:string;role:WorkspaceRole;allowed:boolean;
  target:string;setTarget:(target:string)=>void;targets:{id:string;name:string}[];onLocate:(target:string)=>void;
  action:(action:string,payload:Record<string,unknown>)=>Promise<unknown>;
}) {
  const workspace=useWorkspace();
  const [draft,setDraft]=useState(""),[reply,setReply]=useState<Record<string,string>>({}),[replyTo,setReplyTo]=useState<string|null>(null);
  const [filter,setFilter]=useState<"open"|"resolved">("open"),[scope,setScope]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const previousOpen=useRef(open),compose=useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{if(open&&!previousOpen.current){setFilter("open");setScope(target!=="room");setError("");}previousOpen.current=open;},[open,target]);
  const label=(id:string)=>targets.find(t=>t.id===id)?.name??(id.startsWith("furniture:")?"Removed furniture":id.startsWith("product:")?"Previous product":id.startsWith("layout:")?"Previous layout":"The room");
  const roots=comments.filter(c=>!c.parent_id),visible=roots.filter(c=>c.resolved===(filter==="resolved")&&(!scope||c.target===target)).slice().reverse();
  const count=roots.filter(c=>!c.resolved).length;
  async function send(parent?:WorkspaceComment){
    if(busy)return;setBusy(true);setError("");
    try{await action("comment",{body:parent?reply[parent.id]:draft,target:parent?.target??target,parent_id:parent?.id??null});if(parent){setReply(v=>({...v,[parent.id]:""}));setReplyTo(null);}else setDraft("");}
    catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  async function resolve(comment:WorkspaceComment){setBusy(true);setError("");try{await action("resolve",{comment_id:comment.id,resolved:!comment.resolved});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  if(!open)return null;
  const author=(c:WorkspaceComment)=><header className={s.author}><span style={{background:collaboratorColor(c.user_id,workspace?.members.map(m=>m.user_id))}}>{c.display_name.slice(0,2).toUpperCase()}</span><strong>{c.display_name}{c.user_id===userId?" (you)":""}</strong><time dateTime={c.created_at} title={new Date(c.created_at).toLocaleString()}>{new Date(c.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric"})}</time></header>;
  return <Modal className={s.commentsModal} aria-labelledby="room-comments-title" onClick={()=>{if(!busy)onClose();}} onKeyDown={e=>{if(e.key==="Escape"&&!busy){e.stopPropagation();onClose();}}}><aside className={s.commentsPanel} onClick={e=>e.stopPropagation()}>
    <header className={s.commentsHeading}><div><p className={s.eyebrow}>Make the call together</p><h2 id="room-comments-title">Room <em>notes.</em></h2></div><button className={s.close} disabled={busy} onClick={onClose} aria-label="Close comments">×</button></header>
    <div className={s.commentFilters}><button aria-pressed={filter==="open"} onClick={()=>setFilter("open")}>Open <span>{count}</span></button><button aria-pressed={filter==="resolved"} onClick={()=>setFilter("resolved")}>Resolved <span>{roots.length-count}</span></button></div>
    <form className={s.composer} onSubmit={e=>{e.preventDefault();void send();}}><label>Comment on<select value={target} disabled={busy} onChange={e=>{setTarget(e.target.value);setScope(e.target.value!=="room");}}>{targets.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}{!targets.some(t=>t.id===target)&&<option value={target}>{label(target)}</option>}</select></label><label className={s.visuallyHidden} htmlFor="room-comment-body">Your comment</label><textarea ref={compose} id="room-comment-body" value={draft} maxLength={1500} disabled={!allowed||busy} onChange={e=>setDraft(e.target.value)} placeholder={target==="room"?"What should we try next?":"Leave a thought about this pick…"} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();if(draft.trim()&&allowed)void send();}}}/><footer><small>{draft.length}/1,500</small><button className={s.primary} disabled={!allowed||busy||!draft.trim()}>{busy?"Saving…":"Post comment ↗"}</button></footer>{!allowed&&<p className={s.inlineError}>Comments return when the host has Pro.</p>}</form>
    {error&&<p className={s.inlineError} role="alert">{error}</p>}
    {target!=="room"&&<label className={s.scope}><input type="checkbox" checked={scope} onChange={e=>setScope(e.target.checked)}/>Only notes about {label(target)}</label>}
    <div className={s.threads} aria-label={`${filter} conversations`}>
      {!visible.length&&<div className={s.noComments}><svg viewBox="0 0 80 64" fill="none" aria-hidden="true"><path d="M8 8h57v36H30L8 58V8Z" fill="#e9edff" stroke="#304bff" strokeWidth="2"/><path d="M22 22h29M22 31h18" stroke="#304bff" strokeWidth="2"/><circle cx="63" cy="45" r="12" fill="#ffdd58"/><path d="m58 45 4 4 7-8" stroke="#17172b" strokeWidth="2"/></svg><h3>{filter==="resolved"?"Decisions, kept.":"Start with a thought."}</h3><p>{filter==="resolved"?"Resolved conversations stay here for later.":"Ask about a product, suggest a move, or choose a piece in the plan to leave a note."}</p></div>}
      {visible.map(c=><article key={c.id} className={s.thread} data-resolved={c.resolved}>{author(c)}<button className={s.target} onClick={()=>{onLocate(c.target);onClose();}}>{label(c.target)} <span aria-hidden="true">↗</span></button><p>{c.body}</p><div className={s.threadActions}>{!c.resolved&&<button disabled={!allowed||busy} onClick={()=>setReplyTo(replyTo===c.id?null:c.id)}>Reply{comments.filter(r=>r.parent_id===c.id).length?` (${comments.filter(r=>r.parent_id===c.id).length})`:""}</button>}{(role!=="commenter"||c.user_id===userId)&&<button disabled={!allowed||busy} onClick={()=>void resolve(c)}>{c.resolved?"Reopen":"✓ Resolve"}</button>}</div>
        {comments.filter(r=>r.parent_id===c.id).map(r=><div key={r.id} className={s.reply}>{author(r)}<p>{r.body}</p></div>)}
        {replyTo===c.id&&!c.resolved&&<form className={s.replyForm} onSubmit={e=>{e.preventDefault();void send(c);}}><label className={s.visuallyHidden} htmlFor={`reply-${c.id}`}>Reply to {c.display_name}</label><textarea autoFocus id={`reply-${c.id}`} required maxLength={1500} value={reply[c.id]??""} onChange={e=>setReply(v=>({...v,[c.id]:e.target.value}))} placeholder="Add your reply…" disabled={busy||!allowed}/><button className={s.primary} disabled={busy||!allowed||!reply[c.id]?.trim()}>Send reply</button></form>}
      </article>)}
    </div><p className={s.commentPrivacy}>Only people in this room can see these notes.</p>
  </aside></Modal>;
}
