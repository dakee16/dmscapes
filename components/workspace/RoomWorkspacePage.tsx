"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { usePlannerStore } from "@/lib/store";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { formatRoomType } from "@/lib/format";
import { purchaseForPiece, supplyFor } from "@/lib/planning";
import { currentSnapshot, currentProducts, workspaceRequest } from "@/lib/workspace-client";
import BrandLoader from "@/components/site/BrandLoader";
import Modal from "@/components/site/Modal";
import PlanResult from "@/components/planner/PlanResult";
import ReadOnlyRoom from "./ReadOnlyRoom";
import RoomAppHeader from "./RoomAppHeader";
import { WorkspaceContext, type WorkspaceAccess } from "./WorkspaceContext";
import { useWorkspaceSession } from "./useWorkspaceSession";
import CollaborationProvider, { useCollaboration } from "./CollaborationProvider";
import CommentsPanel from "./CommentsPanel";
import RoomBar from "./RoomBar";
import RoomRail from "./RoomRail";
import BringBoard from "./BringBoard";
import PeoplePanel from "./PeoplePanel";
import { VoicePanel, VoiceProvider, VoiceToast } from "./RoomVoice";
import { initial, personStyle } from "./people";
import s from "./Room.module.css";

export type RoomTab = WorkspaceAccess["section"];

export default function RoomWorkspacePage({ id }: { id: string }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="ds"><RoomAppHeader/><main id="page-content" className={s.state}><BrandLoader label="Opening your room…"/></main></div>;
  if (!user) return <div className="ds"><RoomAppHeader/><main id="page-content" className={s.state}><section className={s.stateCard}><p className={s.stateEyebrow}>My Room</p><h1>Your room <em>is waiting.</em></h1><p>Sign in to open your workspace. Private rooms are only visible to their members.</p><Link className="ds-btn ds-btn--ink-yellow" href={`/login?next=${encodeURIComponent(`/rooms/${id}`)}`}>Sign in to continue</Link></section></main></div>;
  return <WorkspaceSession key={`${user.id}:${id}`} id={id} userId={user.id}/>;
}

function WorkspaceSession({ id, userId }: { id: string; userId: string }) {
  const session = useWorkspaceSession(id, userId), router = useRouter(), { openUpgrade } = useUpgrade();
  const [section, setSection] = useState<RoomTab>("room");
  const [side, setSide] = useState<"comments" | "voice" | null>(null);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(""), [error, setError] = useState("");
  const [target, setTarget] = useState("room");
  const [confirm, setConfirm] = useState<string | null>(null);
  const [overlay, setOverlay] = useState({ pins: true, cursors: true });
  const [following, setFollowing] = useState<string | null>(null);
  const inviteField = useRef<HTMLInputElement>(null);
  function commentOn(next: string) { setTarget(next); setSide("comments"); }
  function locateComment(next: string) {
    if (next.startsWith("product:")) { setSection("shopping"); requestAnimationFrame(() => document.getElementById(`workspace-product-${next.slice(8)}`)?.scrollIntoView({ behavior: "smooth", block: "center" })); }
    else { setSection("room"); if (next.startsWith("furniture:")) usePlannerStore.setState({ selectedItemId: next.slice(10) }); }
  }
  const state = usePlannerStore(), products = currentProducts(state);
  const detail = session.detail, isOwner = detail?.role === "owner";
  const messages: Record<string, string> = { checkpoint: "Version saved.", comment: "Comment added.", revoke: "Invitation cancelled. That place is available again.", restore: "Version restored for everyone. The layout before it is kept in Versions." };
  async function run(action: string, payload: Record<string, unknown> = {}) {
    setBusy(true); setError(""); setMessage("");
    try { const result = await session.action(action, payload); setMessage(messages[action] ?? "Changes saved."); return result; }
    catch (e) { setError((e as Error).message); return null; }
    finally { setBusy(false); }
  }
  async function createInvite(email: string, role: "editor" | "commenter") {
    if (!detail?.ownerPro) { openUpgrade("workspace"); return false; }
    setBusy(true); setError(""); setMessage("");
    try {
      if (!detail.workspace.shared) await session.action("share", { enabled: true });
      const result = await session.action("invite", { role, email });
      if (result.sent) { setMessage(`Invitation sent to ${result.email}. They'll receive a button to join this room.`); return true; }
      return false;
    } catch (e) { setError((e as Error).message); return false; }
    finally { setBusy(false); }
  }
  async function copyLocalChanges() {
    const snapshot = currentSnapshot(); if (!snapshot) return;
    setBusy(true); setError("");
    try {
      const value = await workspaceRequest<{ id: string }>("/api/workspaces", { method: "POST", body: JSON.stringify({ snapshot: { ...snapshot, name: `${snapshot.name?.slice(0, 64)} (my copy)` } }) });
      router.push(`/rooms/${value.id}`);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  function invite() { setSection("roommates"); setSide(null); requestAnimationFrame(() => requestAnimationFrame(() => { inviteField.current?.focus(); inviteField.current?.scrollIntoView({ block: "center", behavior: "smooth" }); })); }
  // The skip link and focus land on the active view when it changes.
  const stage = useRef<HTMLElement>(null), firstTab = useRef(true);
  useEffect(() => { if (firstTab.current) { firstTab.current = false; return; } window.scrollTo({ top: 0 }); }, [section]);

  if (!detail || !state.room) return <div className="ds"><RoomAppHeader/><main id="page-content" className={s.state}>{session.error ? <section className={s.stateCard}><p className={s.stateEyebrow}>My Room</p><h1>Let&apos;s get you <em>back in.</em></h1><p role="alert">{session.error}</p><div className={s.stateActions}><button type="button" className="ds-btn ds-btn--ink-yellow" onClick={() => void session.refresh().catch(e => setError(e.message))}>Try again</button><Link className="ds-btn ds-btn--ghost-ink" href="/rooms">My designs</Link></div>{error && <p role="alert" className={s.inlineError}>{error}</p>}</section> : <BrandLoader label="Opening your room and shopping list…"/>}</main></div>;

  const enabled = detail.workspace.shared && detail.ownerPro;
  const commentAllowed = isOwner || (detail.workspace.shared && detail.ownerPro);
  const access: WorkspaceAccess = { id, members: detail.members, ownerPro: detail.ownerPro, canEdit: detail.canEdit, section, comments: detail.comments, commentOn, overlay };
  const statusLabels = { loading: ["Opening", "Opening room"], saved: ["Saved", "All changes saved"], unsaved: ["Unsaved", "Unsaved changes"], saving: ["Saving…", "Saving your room…"], conflict: ["New changes", "New changes to review"], offline: ["Not saved", "Not saved. Retry when connected."] } as const;
  const status = detail.canEdit ? { label: statusLabels[session.status][0], full: statusLabels[session.status][1], state: session.status } : { label: commentAllowed ? "Can comment" : "View only", full: commentAllowed ? "Comment access · Changes sync automatically" : "View access · Changes sync automatically", state: "view" };
  const school = state.college?.id ? getSchool(state.college.id) : undefined;
  const place = [school ? shortName(school) : state.college?.name, state.dorm?.name, formatRoomType(state.room.type)].filter(Boolean).join(" · ") || `${state.room.lengthFt} × ${state.room.widthFt} ft room`;
  const furniture = state.furniture ?? [];
  const unclaimed = products.filter(p => (state.planning.productSupply[p.id]?.supply ?? "buy") === "buy" && (state.planning.productSupply[p.id]?.assignedTo ?? "shared") === "shared").length
    + furniture.filter(f => f.inventory && !f.built_in && !purchaseForPiece(f, products) && supplyFor(f) === "buy" && (f.assigned_to ?? "shared") === "shared").length;
  const ownerOf = (t: string) => {
    if (t.startsWith("furniture:")) { const f = furniture.find(x => x.id === t.slice(10)); return f ? f.assigned_to ?? "shared" : undefined; }
    if (t.startsWith("product:")) { const v = state.planning.productSupply[t.slice(8)]; return v ? v.assignedTo : products.some(p => p.id === t.slice(8)) ? "shared" : undefined; }
    return undefined;
  };
  const showOnPlan = (itemId: string) => { setSection("room"); usePlannerStore.setState({ selectedItemId: itemId }); };

  return <CollaborationProvider id={id} epoch={detail.workspace.realtime_epoch} enabled={enabled} userId={userId} memberIds={detail.members.map(m => m.user_id)} onChange={() => session.refresh()}><VoiceProvider id={detail.workspace.id} epoch={detail.workspace.realtime_epoch} enabled={enabled}><WorkspaceContext.Provider value={access}>
    <div className={`ds ${s.room}`} data-section={section} data-side={side ?? undefined}>
      <RoomBar detail={detail} userId={userId} name={state.planning.name} place={place} status={status} tab={section} setTab={t => { setSection(t); setFollowing(null); }} badges={{ shopping: unclaimed }}
        side={side} openSide={setSide} onInvite={invite} canRename={detail.canEdit} onRename={name => state.updatePlanning({ name })} />
      <ActivitySync section={section} />
      <Follow id={following} members={detail.members} setSection={setSection} stop={() => setFollowing(null)} />
      <div className={s.notices}>
        {session.status === "conflict" && <div className={s.notice} role="alert"><div><strong>A roommate saved a newer version.</strong><p>Your edits are still here. Keep them in a personal copy, or load the latest shared room.</p></div><div className={s.noticeActions}><button type="button" className={s.ghostBtn} disabled={busy} onClick={() => void copyLocalChanges()}>Keep my edits in a copy</button><button type="button" className={s.inkBtn} onClick={() => setConfirm("reload")}>Load latest shared version</button></div></div>}
        {session.recovery && <div className={s.notice}><div><strong>We found unsaved edits from this tab.</strong></div><div className={s.noticeActions}><button type="button" className={s.inkBtn} onClick={session.recover}>Recover my edits</button><button type="button" className={s.ghostBtn} onClick={session.discardRecovery}>Keep the saved room</button></div></div>}
        {session.error && <div className={`${s.notice} ${s.noticeError}`} role="alert"><div><p>{session.error}</p></div><div className={s.noticeActions}><button type="button" className={s.ghostBtn} onClick={() => void session.save()}>Retry saving</button></div></div>}
        {error && !confirm && section !== "roommates" && <p role="alert" className={s.inlineError}>{error}</p>}
        {message && !confirm && section !== "roommates" && <p role="status" className={s.toast}>{message}<button type="button" aria-label="Dismiss" onClick={() => setMessage("")}>×</button></p>}
      </div>
      <div className={s.body}>
        {section === "room" && <RoomRail detail={detail} userId={userId} overlay={overlay} setOverlay={setOverlay} following={following} onFollow={setFollowing} onInvite={invite} onPeople={() => setSection("roommates")} />}
        <main id="page-content" ref={stage} tabIndex={-1} className={s.stage} data-following={following ? "true" : undefined} style={following ? personStyle(following, detail.members) : undefined}>
          {following && <FollowBanner id={following} members={detail.members} stop={() => setFollowing(null)} />}
          <div className={s.editor} hidden={section !== "room"}>
            {detail.canEdit ? <PlanResult/> : <ReadOnlyRoom room={state.room} items={furniture} style={state.style ?? "minimalist"} products={products} editor={detail.workspace.snapshot.room_dimensions.editor} canComment={commentAllowed}/>}
          </div>
          {section === "shopping" && <BringBoard detail={detail} userId={userId} products={products} commentOn={commentOn} showOnPlan={showOnPlan} />}
          {section === "roommates" && <PeoplePanel ref={inviteField} detail={detail} userId={userId} busy={busy} onInvite={createInvite} onUpgrade={() => openUpgrade("workspace")} run={run} confirm={what => { setError(""); setConfirm(what); }}
            notice={<>{error && !confirm && <p role="alert" className={s.inlineError}>{error}</p>}{message && !confirm && <p role="status" className={s.okNote}>{message}</p>}</>} />}
          {section === "room" && <div className={s.phoneCta}><button type="button" className="ds-btn ds-btn--ink-yellow" onClick={() => setSection("shopping")}>Who brings what{unclaimed ? ` · ${unclaimed} open` : ""}</button></div>}
        </main>
        {side === "comments" && <CommentsPanel open onClose={() => setSide(null)} comments={detail.comments} userId={userId} role={detail.role} allowed={commentAllowed} target={target} setTarget={setTarget} onLocate={locateComment} action={(action, payload) => session.action(action, payload)} ownerTag={ownerOf} targets={[
          { id: "room", name: "The room" },
          ...furniture.map(f => ({ id: `furniture:${f.id}`, name: f.label })),
          ...products.map(p => ({ id: `product:${p.id}`, name: p.name })),
          ...state.planning.alternatives.map(a => ({ id: `layout:${a.id}`, name: a.name })),
        ]}/>}
        {side === "voice" && <VoicePanel members={detail.members} userId={userId} roomName={state.planning.name} onClose={() => setSide(null)} following={following} onFollow={setFollowing} />}
      </div>
      <VoiceToast hidden={side === "voice"} />
      {confirm && <Modal className={s.confirmLayer} aria-labelledby="confirm-title" onKeyDown={e => { if (e.key === "Escape" && !busy) setConfirm(null); }} onClick={() => { if (!busy) setConfirm(null); }}><div className={s.confirm} role="alertdialog" aria-labelledby="confirm-title" aria-describedby="confirm-body" onClick={e => e.stopPropagation()}>
        <h2 id="confirm-title">{confirm === "reload" ? "Load the shared version?" : confirm.startsWith("restore:") ? "Restore this version?" : confirm.startsWith("remove:") ? "Remove this roommate?" : confirm === "personal" ? "Make this room personal?" : confirm === "delete" ? "Delete this workspace?" : "Leave this room?"}</h2>
        <p id="confirm-body">{confirm === "reload" ? "This replaces your unsaved edits. Keep a personal copy first if you want to preserve them." : confirm === "personal" ? "Roommates will lose access and all invitation links will stop working. Your room and shopping list stay saved." : confirm === "delete" ? "The workspace, comments, and versions will be deleted. This cannot be undone. Original saved designs remain available." : confirm.startsWith("restore:") ? "The room and shopping list will return to this version for everyone. The current version is kept in history." : confirm === "leave" ? "You will lose access to this room. Your existing comments remain with its members." : "Their access ends immediately. Existing comments remain with the room."}</p>
        <div className={s.confirmActions}><button type="button" className={confirm === "delete" || confirm === "leave" || confirm.startsWith("remove:") ? s.dangerBtn : s.inkBtn} disabled={busy} onClick={async () => {
          if (confirm === "reload") { try { await session.refresh(true); session.discardRecovery(); setConfirm(null); } catch (e) { setError((e as Error).message); } return; }
          const result = confirm.startsWith("restore:") ? await run("restore", { version_id: confirm.slice(8) }) : confirm.startsWith("remove:") ? await run("member", { user_id: confirm.slice(7), role: "remove" }) : confirm === "personal" ? await run("share", { enabled: false }) : await run(confirm);
          if (result) { if (confirm === "delete" || confirm === "leave") router.push("/rooms"); setConfirm(null); }
        }}>{busy ? "Working…" : "Confirm"}</button><button type="button" className={s.ghostBtn} disabled={busy} onClick={() => setConfirm(null)}>Cancel</button></div>
        {error && <p role="alert" className={s.inlineError}>{error}</p>}
      </div></Modal>}
    </div>
  </WorkspaceContext.Provider></VoiceProvider></CollaborationProvider>;
}

/** Tell the room which view and piece you're on (presence, and others' Follow). */
function ActivitySync({ section }: { section: RoomTab }) {
  const live = useCollaboration(), update = live?.updateActivity;
  const view = usePlannerStore(st => st.plannerView), selected = usePlannerStore(st => st.selectedItemId);
  useEffect(() => { update?.({ section, view, selected }); }, [update, section, view, selected]);
  return null;
}

/** Following someone mirrors their view, 2D/3D and selected piece until you stop or they go. */
function Follow({ id, members, setSection, stop }: { id: string | null; members: { user_id: string }[]; setSection: (s: RoomTab) => void; stop: () => void }) {
  const live = useCollaboration(), peer = id ? live?.peers[id] : undefined;
  const gone = !!id && (live?.status !== "live" || !peer?.active || !members.some(m => m.user_id === id));
  useEffect(() => { if (gone) stop(); }, [gone, stop]);
  useEffect(() => {
    if (!peer || gone) return;
    setSection(peer.section);
    const st = usePlannerStore.getState();
    if (st.plannerView !== peer.view) st.setPlannerView(peer.view);
    if (peer.selected !== st.selectedItemId && (!peer.selected || st.furniture?.some(f => f.id === peer.selected))) usePlannerStore.setState({ selectedItemId: peer.selected });
  }, [peer, gone, setSection]);
  return null;
}
function FollowBanner({ id, members, stop }: { id: string; members: { user_id: string; display_name: string }[]; stop: () => void }) {
  const m = members.find(x => x.user_id === id); if (!m) return null;
  return <div className={s.followBanner} role="status"><span className={s.faceSm} aria-hidden="true">{initial(m.display_name)}</span>You&apos;re following {m.display_name}&apos;s view<button type="button" onClick={stop}>Stop</button></div>;
}
