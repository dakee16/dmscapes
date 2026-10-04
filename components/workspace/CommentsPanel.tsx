"use client";
import { useEffect,useRef,useState } from "react";
import type { WorkspaceComment,WorkspaceRole } from "@/lib/workspace";
import { ArrowRight, Check, CloseIcon } from "@/components/ds/Icons";
import { useWorkspace } from "./WorkspaceContext";
import { ago, initial, personStyle } from "./people";
import s from "./Room.module.css";

/** Comments pinned to the plan: a side panel on desktop, a sheet on phones.
 * Not modal, so the plan stays usable while a thread is open. */
export default function CommentsPanel({open,onClose,comments,userId,role,allowed,target,setTarget,targets,onLocate,action,ownerTag}:{
  open:boolean;onClose:()=>void;comments:WorkspaceComment[];userId:string;role:WorkspaceRole;allowed:boolean;
  target:string;setTarget:(target:string)=>void;targets:{id:string;name:string}[];onLocate:(target:string)=>void;
  action:(action:string,payload:Record<string,unknown>)=>Promise<unknown>;
  /** Whose a commented piece is: a member id, "shared", or undefined when it has no owner. */
  ownerTag?:(target:string)=>string|undefined;
}) {
  const workspace=useWorkspace(),members=workspace?.members??[];
  const [draft,setDraft]=useState(""),[reply,setReply]=useState<Record<string,string>>({}),[replyTo,setReplyTo]=useState<string|null>(null);
  const [filter,setFilter]=useState<"open"|"resolved">("open"),[scope,setScope]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const previousOpen=useRef(open),compose=useRef<HTMLTextAreaElement>(null),heading=useRef<HTMLHeadingElement>(null);
  useEffect(()=>{if(open&&!previousOpen.current){setFilter("open");setScope(target!=="room");setError("");requestAnimationFrame(()=>heading.current?.focus({preventScroll:true}));}previousOpen.current=open;},[open,target]);
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
  const author=(c:WorkspaceComment,big=false)=><div className={s.commentAuthor}>
    <span className={big?s.faceMd:s.faceSm} style={personStyle(c.user_id,members)} aria-hidden="true">{initial(c.display_name)}</span>
    <div><p className={s.commentWho}>{c.display_name}{c.user_id===userId?" (you)":""} <time dateTime={c.created_at} title={new Date(c.created_at).toLocaleString()}>· {ago(c.created_at)}</time></p><p className={s.commentBody}>{c.body}</p></div>
  </div>;
  const tag=(t:string)=>{const owner=ownerTag?.(t);if(!owner)return null;if(owner==="shared")return <span className={s.tagShared}>Shared</span>;const m=members.find(x=>x.user_id===owner);return m?<span className={s.tagPerson} style={personStyle(m.user_id,members)}>{m.display_name}</span>:null;};
  return <aside className={`${s.sidePanel} ${s.commentsPanel}`} id="room-side-panel" aria-labelledby="room-comments-title" onKeyDown={e=>{if(e.key==="Escape"&&!busy){e.stopPropagation();onClose();}}}>
    <header className={s.panelHead}><h2 id="room-comments-title" ref={heading} tabIndex={-1}>Comments <span className={s.panelCount}>{count}</span></h2><button type="button" className={s.panelClose} disabled={busy} onClick={onClose} aria-label="Close comments"><CloseIcon size={18}/></button></header>
    <div className={s.commentFilters} role="group" aria-label="Show"><button type="button" aria-pressed={filter==="open"} onClick={()=>setFilter("open")}>Open · {count}</button><button type="button" aria-pressed={filter==="resolved"} onClick={()=>setFilter("resolved")}>Resolved · {roots.length-count}</button></div>
    <form className={s.composer} onSubmit={e=>{e.preventDefault();void send();}}>
      <label className={s.composerLabel}>Comment on<select value={target} disabled={busy} onChange={e=>{setTarget(e.target.value);setScope(e.target.value!=="room");}}>{targets.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}{!targets.some(t=>t.id===target)&&<option value={target}>{label(target)}</option>}</select></label>
      <label className="ds-sr" htmlFor="room-comment-body">Your comment</label>
      <textarea ref={compose} id="room-comment-body" value={draft} maxLength={1500} disabled={!allowed||busy} onChange={e=>setDraft(e.target.value)} placeholder={target==="room"?"What should we try next?":"Leave a thought about this pick…"} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();if(draft.trim()&&allowed)void send();}}}/>
      <div className={s.composerFoot}><small>{draft.length}/1,500</small><button type="submit" className={s.inkBtn} disabled={!allowed||busy||!draft.trim()}>{busy?"Saving…":"Post comment"}</button></div>
      {!allowed&&<p className={s.inlineError}>Comments return when the host has Pro.</p>}
    </form>
    {error&&<p className={s.inlineError} role="alert">{error}</p>}
    {target!=="room"&&<label className={s.scope}><input type="checkbox" checked={scope} onChange={e=>setScope(e.target.checked)}/>Only notes about {label(target)}</label>}
    <div className={s.threads} aria-label={`${filter} conversations`}>
      {!visible.length&&<div className={s.noComments}><h3>{filter==="resolved"?"Decisions, kept.":"Start with a thought."}</h3><p>{filter==="resolved"?"Resolved conversations stay here for later.":"Ask about a product, suggest a move, or choose a piece in the plan to leave a note."}</p></div>}
      {visible.map(c=>{const replies=comments.filter(r=>r.parent_id===c.id);return <article key={c.id} className={s.thread} data-resolved={c.resolved} aria-label={`Thread on ${label(c.target)}`}>
        <header className={s.threadHead}>
          <button type="button" className={s.threadTarget} onClick={()=>{onLocate(c.target);if(window.matchMedia("(max-width: 780px)").matches)onClose();}} title="Show it in the room">{label(c.target)}</button>
          {tag(c.target)}
          {(role!=="commenter"||c.user_id===userId)&&<button type="button" className={c.resolved?s.reopenBtn:s.resolveBtn} disabled={!allowed||busy} onClick={()=>void resolve(c)}>{c.resolved?"Reopen":<><Check size={13}/>Resolve</>}</button>}
        </header>
        <div className={s.threadBody}>
          {author(c,true)}
          {replies.map(r=><div key={r.id}>{author(r,true)}</div>)}
          {!c.resolved&&(replyTo===c.id?<form className={s.replyForm} onSubmit={e=>{e.preventDefault();void send(c);}}><label className="ds-sr" htmlFor={`reply-${c.id}`}>Reply to {c.display_name}</label><textarea autoFocus id={`reply-${c.id}`} rows={1} required maxLength={1500} value={reply[c.id]??""} onChange={e=>setReply(v=>({...v,[c.id]:e.target.value}))} placeholder="Reply…" disabled={busy||!allowed} onKeyDown={e=>{if((e.ctrlKey||e.metaKey)&&e.key==="Enter"){e.preventDefault();if(reply[c.id]?.trim()&&allowed)void send(c);}}}/><button type="submit" className={s.sendBtn} aria-label="Send reply" disabled={busy||!allowed||!reply[c.id]?.trim()}><ArrowRight size={18}/></button></form>
            :<button type="button" className={s.replyBtn} disabled={!allowed||busy} onClick={()=>setReplyTo(c.id)}>Reply{replies.length?` · ${replies.length}`:""}</button>)}
        </div>
      </article>;})}
    </div>
    <p className={s.commentPrivacy}>Only people in this room can see these notes.</p>
  </aside>;
}
