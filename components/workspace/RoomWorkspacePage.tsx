"use client";
import ProductImage from "@/components/products/ProductImage";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { usePlannerStore } from "@/lib/store";
import { assignOwnership, shoppingProducts } from "@/lib/planning";
import { currentSnapshot, currentProducts, workspaceRequest } from "@/lib/workspace-client";
import { WORKSPACE_MEMBER_LIMIT } from "@/lib/workspace";
import BrandLoader from "@/components/site/BrandLoader";
import Modal from "@/components/site/Modal";
import PlanResult from "@/components/planner/PlanResult";
import ReadOnlyRoom from "./ReadOnlyRoom";
import RoomAppHeader from "./RoomAppHeader";
import { WorkspaceContext, type WorkspaceAccess } from "./WorkspaceContext";
import { useWorkspaceSession } from "./useWorkspaceSession";
import s from "./Workspace.module.css";

export default function RoomWorkspacePage({ id }: { id: string }) {
  const { user, loading } = useAuth();
  if (loading) return <><RoomAppHeader/><div className={s.dashboard}><BrandLoader label="Opening your room…"/></div></>;
  if (!user) return <><RoomAppHeader/><main className={s.dashboard}><section className={s.empty}><h1>Your room is waiting.</h1><p>Sign in to open your workspace. Private rooms are only visible to their members.</p><Link className={s.primary} href={`/login?next=${encodeURIComponent(`/rooms/${id}`)}`}>Sign in to continue</Link></section></main></>;
  return <WorkspaceSession key={`${user.id}:${id}`} id={id} userId={user.id}/>;
}
function WorkspaceSession({ id, userId }: { id: string; userId: string }) {
  const session = useWorkspaceSession(id, userId), router = useRouter(), { openUpgrade } = useUpgrade();
  const [section, setSection] = useState<WorkspaceAccess["section"]>("room");
  const [dialog, setDialog] = useState<"invite" | "history" | "settings" | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [inviteEmail, setInviteEmail] = useState(""), [inviteRole, setInviteRole] = useState("editor");
  const [comment, setComment] = useState(""), [target, setTarget] = useState("room"), [versionName, setVersionName] = useState("");
  const [confirm, setConfirm] = useState<string | null>(null);
  const state = usePlannerStore(), products = currentProducts(state);
  const detail = session.detail, isOwner = detail?.role === "owner";
  async function run(action: string, payload: Record<string, unknown> = {}) {
    setBusy(true); setError(""); setMessage("");
    try { const result = await session.action(action, payload); setMessage(action === "checkpoint" ? "Version saved." : action === "comment" ? "Comment added." : "Changes saved."); return result; }
    catch (e) { setError((e as Error).message); return null; }
    finally { setBusy(false); }
  }
  async function createInvite() {
    if (!detail?.ownerPro) { openUpgrade("workspace"); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      if (!detail.workspace.shared) await session.action("share", { enabled: true });
      const result = await session.action("invite", { role: inviteRole, email: inviteEmail });
      if (result.sent) { setMessage(`Invitation sent to ${result.email}. They'll receive a button to join this room.`); setInviteEmail(""); }
    } catch (error) { setError((error as Error).message); }
    finally { setBusy(false); }
  }
  async function copyLocalChanges() {
    const snapshot = currentSnapshot(); if (!snapshot) return;
    setBusy(true); setError("");
    try {
      const value = await workspaceRequest<{ id: string }>("/api/workspaces", { method: "POST", body: JSON.stringify({ snapshot: { ...snapshot, name: `${snapshot.name?.slice(0,64)} (my copy)` } }) });
      router.push(`/rooms/${value.id}`);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  if (!detail || !state.room) return <><RoomAppHeader/><main className={s.dashboard}>{session.error ? <div className={s.empty}><h2>Let&apos;s get you back in.</h2><p role="alert">{session.error}</p><div className={s.buttons}><button className={s.primary} onClick={() => void session.refresh().catch(e => setError(e.message))}>Try again</button><Link className={s.secondary} href="/rooms">My rooms</Link></div>{error && <p role="alert">{error}</p>}</div> : <BrandLoader label="Opening your room and shopping list…"/>}</main></>;
  const access = { id, members: detail.members, ownerPro: detail.ownerPro, canEdit: detail.canEdit, section };
  const statusLabels = { loading: "Opening room", saved: "All changes saved", unsaved: "Unsaved changes", saving: "Saving your room…", conflict: "New changes to review", offline: "Not saved. Retry when connected." };
  const commentAllowed = isOwner || (detail.workspace.shared && detail.ownerPro);
  const buying = shoppingProducts(products, state.planning);
  return <WorkspaceContext.Provider value={access}><RoomAppHeader/>
    <header className={s.workspaceHeader}><div><div className={s.roomTitle}><input aria-label="Room name" key={state.planning.name} defaultValue={state.planning.name} maxLength={80} readOnly={!detail.canEdit} onBlur={e => { const name = e.target.value.trim(); if (name) state.updatePlanning({ name }); else e.target.value = state.planning.name; }}/></div><span className={s.saveStatus} data-state={session.status} role="status"><i/>{detail.canEdit ? statusLabels[session.status] : commentAllowed ? "Comment access · Changes sync automatically" : "View access · Changes sync automatically"}</span></div>
      <div className={s.buttons}><div className={s.avatarRow} aria-label={`${detail.members.length} room members`}>{detail.members.slice(0,4).map(m => <span key={m.user_id} title={`${m.display_name} · ${m.role}`}>{m.display_name.slice(0,2).toUpperCase()}</span>)}</div>{isOwner && <button className={s.primary} onClick={() => { setDialog("invite"); setError(""); setMessage(""); }}>Invite roommates ↗</button>}<button className={s.secondary} onClick={() => setDialog("settings")} aria-label="Room settings">•••</button></div></header>
    <nav className={s.workspaceNav} aria-label="Room workspace">{([['room','Room'],['shopping','Shopping'],['roommates','Roommates']] as const).map(([key,label]) => <button key={key} aria-current={section === key ? "page" : undefined} onClick={() => setSection(key)}>{label}</button>)}<button onClick={() => setDialog("history")}>Version history</button></nav>
    <main id="page-content" className={s.workspaceMain}>
      {session.status === "conflict" && <div className={s.notice} role="alert"><strong>A roommate saved a newer version.</strong><p>Your edits are still here. Keep them in a personal copy, or load the latest shared room.</p><div className={s.buttons}><button className={s.secondary} disabled={busy} onClick={() => void copyLocalChanges()}>Keep my edits in a copy</button><button className={s.secondary} onClick={() => setConfirm("reload")}>Load latest shared version</button></div></div>}
      {session.recovery && <div className={s.notice}><strong>We found unsaved edits from this tab.</strong><div className={s.buttons}><button className={s.secondary} onClick={session.recover}>Recover my edits</button><button className={s.secondary} onClick={session.discardRecovery}>Keep the saved room</button></div></div>}
      {session.error && <div className={s.error} role="alert">{session.error} <button onClick={() => void session.save()}>Retry saving</button></div>}
      {error && !dialog && <p role="alert" className={s.error}>{error}</p>}
      {section === "shopping" && <section className={s.shoppingBoard}><header><div><p className={s.eyebrow}>Your shopping list / Ready for move-in</p><h2>Who&apos;s bringing <em>what?</em></h2><p>Track what you already have. Your product picks and room stay connected below.</p></div><strong>${buying.reduce((n,p) => n+p.price,0).toFixed(2)} <small className={s.muted}>to buy</small></strong></header>
        <div className={s.checklist}>{products.length ? products.map(p => { const ownership = state.planning.productSupply[p.id] ?? { supply: "buy", assignedTo: "shared" }; const assign = (patch: Partial<typeof ownership>) => usePlannerStore.setState(st => assignOwnership(st.furniture ?? [],st.planning,products,{productId:p.id},patch)); return <div className={s.checkRow} key={p.id}><ProductImage src={p.image_url}/><div><strong>{p.name}</strong><small>${p.price.toFixed(2)} · <a href={p.affiliate_url} target="_blank" rel="noopener noreferrer sponsored">View product ↗</a></small></div><select disabled={!detail.canEdit} aria-label={`Supply for ${p.name}`} value={ownership.supply} onChange={e => assign({ supply: e.target.value as typeof ownership.supply })}><option value="buy">To buy</option><option value="owned">Already have</option><option value="school">School provides</option></select><select disabled={!detail.canEdit} aria-label={`Who brings ${p.name}`} value={ownership.assignedTo} onChange={e => assign({ assignedTo:e.target.value })}><option value="shared">Shared</option>{detail.members.map(m => <option value={m.user_id} key={m.user_id}>{m.display_name}</option>)}{state.planning.roommates.filter(r => !detail.members.some(m => m.user_id === r.id)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}</select></div>; }) : <p className={s.muted}>Your shopping list is ready for its first pick. Browse the product panel below.</p>}</div><p className={s.muted}>Prices are estimates and can change at checkout. Dormscape may earn from qualifying purchases.</p></section>}
      <div className={s.editor} data-section={section}>
        {detail.canEdit ? <PlanResult/> : <ReadOnlyRoom room={state.room} items={state.furniture ?? []} style={state.style ?? "minimalist"} products={products} editor={detail.workspace.snapshot.room_dimensions.editor} canComment={commentAllowed}/>}
      </div>
      {section === "roommates" && <div className={s.collaboration}><aside className={s.people}><p className={s.eyebrow}>Your people</p><h2>Better, <em>together.</em></h2><p>Editors can arrange the room and update shopping. Commenters can give feedback. Nobody needs to buy Pro to join your Pro room.</p>{detail.members.map(m => <div className={s.member} key={m.user_id}><span>{m.display_name.slice(0,2).toUpperCase()}</span><div><strong>{m.display_name}{m.user_id===userId ? " (you)" : ""}</strong><small>{m.role}</small></div>{isOwner && m.role !== "owner" && <select aria-label={`Access for ${m.display_name}`} disabled={busy} value={m.role} onChange={e => { if (e.target.value === "remove") setConfirm(`remove:${m.user_id}`); else void run("member", { user_id: m.user_id, role: e.target.value }); }}><option value="editor">Can edit</option><option value="commenter">Can comment</option><option value="remove">Remove access</option></select>}</div>)}<p>{detail.members.length} of {WORKSPACE_MEMBER_LIMIT} people</p>{isOwner && <button className={s.primary} onClick={() => setDialog("invite")}>Invite a roommate ↗</button>}{!detail.ownerPro && isOwner && <p>Pro hosts one shared room. Your personal rooms stay available on every plan.</p>}</aside>
        <section className={s.comments}><p className={s.eyebrow}>Decide it here</p><h2>Same room.<br/><em>Everyone&apos;s say.</em></h2><p>Leave feedback on a layout or product. Comments are visible only to this room&apos;s members.</p><form onSubmit={async e => { e.preventDefault(); if (await run("comment", { body: comment, target })) setComment(""); }}><label className={s.field}>About<select value={target} onChange={e => setTarget(e.target.value)}><option value="room">The room</option>{state.planning.alternatives.map(a => <option key={a.id} value={`layout:${a.id}`}>{a.name}</option>)}{products.map(p => <option key={p.id} value={`product:${p.id}`}>{p.name}</option>)}</select></label><label className={s.field}>Your comment<textarea required maxLength={1500} value={comment} onChange={e => setComment(e.target.value)} placeholder="What do you think about moving the desk near the window?" disabled={!commentAllowed}/></label><button className={s.primary} disabled={busy || !comment.trim() || !commentAllowed}>{busy ? "Posting…" : "Add comment"}</button></form>
          {detail.comments.length ? detail.comments.map(c => <article className={s.comment} data-resolved={c.resolved} key={c.id}><header><strong>{c.display_name}</strong><small>{new Date(c.created_at).toLocaleDateString()}</small><span className={s.targetTag}>{c.target === "room" ? "Room" : c.target.startsWith("layout:") ? state.planning.alternatives.find(a => `layout:${a.id}`===c.target)?.name ?? "Layout" : products.find(p => `product:${p.id}`===c.target)?.name ?? "Product"}</span></header><p>{c.body}</p><button disabled={busy || !commentAllowed} onClick={() => void run("resolve", { comment_id:c.id, resolved:!c.resolved })}>{c.resolved ? "✓ Resolved · Reopen" : "Mark resolved"}</button></article>) : <div className={s.empty} style={{marginTop:24,padding:32}}><h3>Start the conversation.</h3><p>A good room starts with a shared idea.</p></div>}
        </section></div>}
      {message && !dialog && <p role="status" className={s.muted}>{message}</p>}
    </main>
    {dialog && <Modal className={`${s.modal} ${s.app}`} role="dialog" aria-modal="true" aria-labelledby="workspace-dialog-title" onKeyDown={e => { if(e.key==="Escape"&&!busy)setDialog(null); }} onClick={() => { if(!busy)setDialog(null); }}><div className={s.dialog} onClick={e => e.stopPropagation()}><header><div><p className={s.eyebrow}>Your room / {dialog}</p><h2 id="workspace-dialog-title">{dialog === "invite" ? "Make room for friends." : dialog === "history" ? "Every good idea, kept." : "Room settings."}</h2></div><button disabled={busy} aria-label="Close room dialog" onClick={() => setDialog(null)}>Close</button></header>
      {dialog === "invite" && <><p className={s.muted}>You + three roommates. Enter their email and we&apos;ll send a personal invitation. They join free using that same email address.</p>
        <div className={s.inviteCapacity}><span>{detail.members.length} joined</span><span>{detail.invitations?.length ?? 0} invited</span><strong>{WORKSPACE_MEMBER_LIMIT} places total</strong></div>
        <form onSubmit={e => { e.preventDefault(); void createInvite(); }} className={s.inviteForm}>
          <label className={s.field}>Roommate&apos;s email<input type="email" autoComplete="email" required maxLength={254} placeholder="roommate@school.edu" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} disabled={busy}/></label>
          <label className={s.field}>Access<select disabled={busy} value={inviteRole} onChange={e => setInviteRole(e.target.value)}><option value="editor">Can edit</option><option value="commenter">Can comment</option></select></label>
          <p className={s.muted}>{inviteRole === "editor" ? "Can arrange the room, update shopping, and comment." : "Can view the room and shopping list, and leave comments."}</p>
          <button className={s.primary} type={detail.ownerPro ? "submit" : "button"} onClick={() => { if (!detail.ownerPro) openUpgrade("workspace"); }} disabled={busy || (detail.ownerPro && detail.members.length >= WORKSPACE_MEMBER_LIMIT)}>{busy ? "Sending invitation…" : detail.ownerPro ? "Send invitation ↗" : "Unlock shared rooms with Pro"}</button>
        </form>
        {!!detail.invitations?.length && <section className={s.pendingInvites} aria-label="Pending invitations"><h3>On the guest list</h3><p className={s.muted}>Invitations reserve a place for seven days. Sending again to the same email replaces its previous invitation.</p>{detail.invitations.map(invite => <div key={invite.id}><span><strong>{invite.email}</strong><small>{invite.role === "editor" ? "Can edit" : "Can comment"} · Expires {new Date(invite.expires_at).toLocaleDateString()}</small></span><button disabled={busy} className={s.secondary} aria-label={`Cancel invitation to ${invite.email}`} onClick={async () => { if (await run("revoke", { invite_id: invite.id })) setMessage("Invitation cancelled. That place is available again."); }}>Cancel</button></div>)}</section>}
        {detail.members.length >= WORKSPACE_MEMBER_LIMIT && <p className={s.notice}>Your room is full. Remove a member in Roommates before inviting someone else.</p>}
      </>}
      {dialog === "history" && <>{detail.canEdit && <form onSubmit={async e => { e.preventDefault(); if(await run("checkpoint", {name:versionName}))setVersionName(""); }}><label className={s.field}>Keep a named version<input required maxLength={80} value={versionName} onChange={e=>setVersionName(e.target.value)} placeholder="The layout we both love"/></label><button className={s.primary} disabled={busy || !versionName.trim()}>Save version</button></form>}<p className={s.muted} style={{marginTop:20}}>Your latest 20 versions. Restoring also keeps a copy of the current layout and shopping list.</p>{detail.versions.map(v=><div className={s.historyItem} key={v.id}><div><strong>{v.name}</strong><small>{new Date(v.created_at).toLocaleString()}</small></div>{detail.canEdit&&<button disabled={busy} onClick={()=>setConfirm(`restore:${v.id}`)}>Restore</button>}</div>)}</>}
      {dialog === "settings" && <><p className={s.muted}>{isOwner ? "You own this room. Personal rooms are private. Shared rooms are visible to their members." : "This room belongs to its host. Your personal rooms are separate."}</p><div className={s.buttons} style={{marginTop:24}}>{isOwner ? <>{detail.workspace.shared&&<button className={s.secondary} onClick={()=>setConfirm("personal")}>Make personal</button>}<button className={s.secondary} onClick={()=>setConfirm("delete")}>Delete workspace</button></> : <button className={s.secondary} onClick={()=>setConfirm("leave")}>Leave room</button>}</div><p className={s.muted} style={{marginTop:16}}>Original saved designs remain in My rooms when you delete a workspace.</p></>}
      {message&&<p role="status" className={s.notice}>{message}</p>}{error&&<p role="alert" className={s.error}>{error}</p>}
    </div></Modal>}
    {confirm && <Modal className={`${s.modal} ${s.app}`} role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" onKeyDown={e=>{if(e.key==="Escape"&&!busy)setConfirm(null);}}><div className={s.dialog}><h2 id="confirm-title">{confirm==="reload" ? "Load the shared version?" : confirm.startsWith("restore:") ? "Restore this version?" : confirm.startsWith("remove:") ? "Remove this roommate?" : confirm==="personal" ? "Make this room personal?" : confirm==="delete" ? "Delete this workspace?" : "Leave this room?"}</h2><p className={s.muted} style={{marginTop:16}}>{confirm==="reload" ? "This replaces your unsaved edits. Keep a personal copy first if you want to preserve them." : confirm==="personal" ? "Roommates will lose access and all invitation links will stop working. Your room and shopping list stay saved." : confirm==="delete" ? "The workspace, comments, and versions will be deleted. This cannot be undone. Original saved designs remain available." : confirm.startsWith("restore:") ? "The room and shopping list will return to this version for everyone. The current version is kept in history." : confirm==="leave" ? "You will lose access to this room. Your existing comments remain with its members." : "Their access ends immediately. Existing comments remain with the room."}</p><div className={s.buttons} style={{marginTop:24}}><button className={s.primary} disabled={busy} onClick={async()=>{
      if(confirm==="reload"){try{await session.refresh(true);session.discardRecovery();setConfirm(null);}catch(e){setError((e as Error).message);}return;}
      const result=confirm.startsWith("restore:")?await run("restore",{version_id:confirm.slice(8)}):confirm.startsWith("remove:")?await run("member",{user_id:confirm.slice(7),role:"remove"}):confirm==="personal"?await run("share",{enabled:false}):await run(confirm);
      if(result){if(confirm==="delete"||confirm==="leave")router.push("/rooms");setConfirm(null);setInviteEmail("");}
    }}>{busy ? "Working…" : "Confirm"}</button><button className={s.secondary} disabled={busy} onClick={()=>setConfirm(null)}>Cancel</button></div>{error&&<p role="alert" className={s.error}>{error}</p>}</div></Modal>}
  </WorkspaceContext.Provider>;
}
