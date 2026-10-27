"use client";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import Image from "next/image";
import localFont from "next/font/local";
import type { WorkspaceDetail, WorkspaceMember } from "@/lib/workspace";
import { WORKSPACE_MEMBER_LIMIT } from "@/lib/workspace";
import { usePlannerStore } from "@/lib/store";
import Modal, { ModalClose } from "@/components/site/Modal";
import BrandLoader from "@/components/site/BrandLoader";
import { ago, initial, PERSON_COLORS, personColor, personInk, roleLabel } from "./people";
import s from "./Room.module.css";
import p from "./People.module.css";

// The name cards are written in marker (Apache 2.0, licence beside the file).
const marker = localFont({ src: "./fonts/permanent-marker.woff2", variable: "--font-marker", display: "swap" });

type Invite = WorkspaceDetail["invitations"][number];
type Seat =
  | { kind: "member"; i: number; m: WorkspaceMember }
  | { kind: "pending"; i: number; inv: Invite }
  | { kind: "open"; i: number };
type Role = "editor" | "commenter";

/** Where each card is taped on the door, in the render's own coordinates (door face 26.9–73.1% across, 13–95% down). */
const SPOTS = [{ l: 29.6, t: 18.6, r: -2.5 }, { l: 50.9, t: 19, r: 2 }, { l: 29.9, t: 38.8, r: 1.5 }, { l: 50.6, t: 39.2, r: -2 }];
const spot = (i: number) => SPOTS[i] ?? { l: 29.6 + (i % 2) * 21.3, t: 18.6 + Math.floor(i / 2) * 20.2, r: i % 2 ? 2 : -2 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const ACCESS: Record<Role, string> = { editor: "Can arrange the room, update shopping, and comment.", commenter: "Can view the room and shopping list, and leave comments." };
const until = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

/** What RoomWorkspacePage's Invite buttons call: open the invite card for the first open seat. */
export type PeopleHandle = { focus: () => void; scrollIntoView: (options?: ScrollIntoViewOptions) => void };

type Props = {
  detail: WorkspaceDetail; userId: string; busy: boolean;
  onInvite: (email: string, role: Role) => Promise<boolean>;
  onUpgrade: () => void;
  run: (action: string, payload?: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  confirm: (what: string) => void;
  notice: React.ReactNode;
};

/**
 * People in the room as the room's own door (design-handoff/v2 MyRoomPeople):
 * one name card per seat taped to a render of a dorm door, host first, then
 * members, pending invitations and open seats. A card opens its seat: invite
 * someone, resend or cancel an invitation, or change a roommate's access. The
 * roster beside the door mirrors the seats. Room versions sit below.
 */
const PeoplePanel = forwardRef<PeopleHandle, Props>(function PeoplePanel({ detail, userId, busy, onInvite, onUpgrade, run, confirm, notice }, ref) {
  const isOwner = detail.role === "owner";
  const hall = usePlannerStore(st => st.dorm?.name);
  const [open, setOpen] = useState<number | null>(null);
  // The room's last message shows inside a seat card only once you act in that card.
  const [acted, setActed] = useState(false);
  const [fresh, setFresh] = useState("");
  const [email, setEmail] = useState(""), [role, setRole] = useState<Role>("editor"), [bad, setBad] = useState("");
  const [selected, setSelected] = useState<string | null>(null), [versionName, setVersionName] = useState("");
  const scene = useRef<HTMLDivElement>(null), emailField = useRef<HTMLInputElement>(null);

  const invites = isOwner ? detail.invitations ?? [] : [];
  const members = detail.members.slice(0, WORKSPACE_MEMBER_LIMIT);
  const seats: Seat[] = [
    ...members.map((m, i) => ({ kind: "member" as const, i, m })),
    ...invites.map((inv, k) => ({ kind: "pending" as const, i: members.length + k, inv })),
  ].slice(0, WORKSPACE_MEMBER_LIMIT);
  while (seats.length < WORKSPACE_MEMBER_LIMIT) seats.push({ kind: "open", i: seats.length });
  const openSeats = seats.filter(x => x.kind === "open").length;
  const full = detail.members.length >= WORKSPACE_MEMBER_LIMIT;
  const color = (x: Seat) => x.kind === "member" ? personColor(x.m.user_id, detail.members) : PERSON_COLORS[x.i % PERSON_COLORS.length];
  const nameOf = (m: WorkspaceMember) => m.display_name + (m.user_id === userId ? " (you)" : "");
  const subOf = (x: Seat) => x.kind === "member" ? (x.m.role === "owner" ? "Hosts this room" : x.m.role === "editor" ? "Arranges the room and the list" : "Reads and comments")
    : x.kind === "pending" ? `Invited · ${x.inv.role === "editor" ? "Can edit" : "Can comment"} · holds a seat until ${until(x.inv.expires_at)}`
    : isOwner ? "Tap its card on the door" : "Open";

  function openSeat(i: number) { setOpen(i); setActed(false); setEmail(""); setRole("editor"); setBad(""); }
  const close = () => { if (!busy) setOpen(null); };
  useImperativeHandle(ref, () => ({
    focus: () => { const free = seats.find(x => x.kind === "open"); if (isOwner && free) openSeat(free.i); },
    scrollIntoView: options => scene.current?.scrollIntoView(options),
  }));

  async function send(e: React.FormEvent, i: number) {
    e.preventDefault();
    if (!detail.ownerPro) { onUpgrade(); return; }
    const mail = email.trim();
    if (!EMAIL_RE.test(mail)) { setBad("That email doesn't look right."); return; }
    setActed(true);
    if (await onInvite(mail, role)) { setOpen(null); setFresh(mail.toLowerCase()); }
  }

  const current = detail.versions[0];
  const chosen = detail.versions.find(v => v.id === selected) ?? null;
  const isCurrent = (v: { revision: number }) => v.revision === detail.workspace.revision;
  const seat = open === null ? null : seats[open] ?? null;
  const c = seat ? color(seat) : PERSON_COLORS[1];
  // The invite card opens on its email field (the dialog base would focus Close first).
  const inviting = seat?.kind === "open";
  useEffect(() => {
    if (!inviting) return;
    const f = requestAnimationFrame(() => emailField.current?.focus());
    return () => cancelAnimationFrame(f);
  }, [inviting, open]);

  return <div className={`${p.wrap} ${marker.variable}`}>
    <section className={p.main} aria-labelledby="people-title">
      <div className={p.copy}>
        <p className={p.eyebrow}>My Room · Included with Pro</p>
        <h2 id="people-title" className={p.h}><span className={p.hs}>People</span><span className={p.hf}>in the room.</span></h2>
        <p className={p.lede}>Editors arrange the room and update who brings what. Commenters weigh in without moving the bed. Nobody needs Pro to join a Pro room.</p>
        {isOwner && openSeats > 0 && <p className={p.hint}><i aria-hidden="true"><Plus /></i>Tap an empty name card on the door to invite someone</p>}
        {isOwner && !full && openSeats === 0 && <p className={p.held}><strong>Every seat is held</strong><small>Invitations hold a seat for seven days. Cancel one to invite someone else, or resend it if it got lost.</small></p>}
        <ul className={p.roster} aria-label="Seats">
          {seats.map(x => <li key={x.i} data-open={x.kind === "open" || undefined}>
            <span className={p.av} data-open={x.kind === "open" || undefined} style={{ "--c": color(x), "--ci": personInk(color(x)) } as React.CSSProperties} aria-hidden="true">
              {x.kind === "member" ? initial(x.m.display_name) : x.kind === "pending" ? initial(x.inv.email) : "+"}
            </span>
            <span className={p.who}><strong>{x.kind === "member" ? nameOf(x.m) : x.kind === "pending" ? x.inv.email : "Open seat"}</strong><small>{subOf(x)}</small></span>
            {x.kind === "member" && x.m.role !== "owner" && isOwner ? <span className={p.ctl}>
              <label><span className="ds-sr">Access for {x.m.display_name}</span><select disabled={busy} value={x.m.role} onChange={e => void run("member", { user_id: x.m.user_id, role: e.target.value })}><option value="editor">Can edit</option><option value="commenter">Can comment</option></select></label>
              <button type="button" className={p.remove} disabled={busy} onClick={() => confirm(`remove:${x.m.user_id}`)}>Remove<span className="ds-sr"> {x.m.display_name}</span></button>
            </span>
              : <span className={p.pill} data-kind={x.kind === "member" ? (x.m.role === "owner" ? "host" : "member") : x.kind}>{x.kind === "member" ? roleLabel(x.m.role) : x.kind === "pending" ? "Invited" : "Free"}</span>}
          </li>)}
        </ul>
        {open === null && notice}
        {isOwner && <p className={p.fine}>Invitations go by email and only work for that address. Each one holds a seat for seven days; sending again to the same email replaces it. {full && "Your room is full. Remove someone before inviting another person."}</p>}
        {isOwner && !detail.ownerPro && <p className={p.fine}>Pro hosts one shared room. Your personal rooms stay available on every plan.</p>}
        <div className={p.credits}><span className={p.av} style={{ "--c": "var(--ds-yellow)", "--ci": "var(--ds-ink)" } as React.CSSProperties} aria-hidden="true">$</span><div><h3>Credits stay yours</h3><p>Invitations use no credits, and guests never spend yours.</p></div></div>
        <div className={p.roomCard}>{isOwner ? <>
          <h3>{detail.workspace.shared ? "Close this room" : "Delete this room"}</h3>
          <p>{detail.workspace.shared ? "Everyone loses access. Your room and shopping list stay saved." : "Personal rooms are private to you. Original saved designs stay in My designs."}</p>
          <div>{detail.workspace.shared && <button type="button" onClick={() => confirm("personal")}>Make it personal</button>}<button type="button" onClick={() => confirm("delete")}>Delete workspace</button></div>
        </> : <>
          <h3>Leave this room</h3><p>This room belongs to its host. Your personal rooms are separate.</p>
          <div><button type="button" onClick={() => confirm("leave")}>Leave room</button></div>
        </>}</div>
      </div>

      <div ref={scene} className={p.scene} data-anim="">
        <Image src="/redesign/myroom-door.webp" alt={`The door to ${hall ?? "your room"}: an oak door in a blue metal frame on a painted block wall, with a name card taped to it for each seat.`} fill sizes="(min-width: 881px) 640px, 520px" quality={75} />
        {hall && <span className={p.plate} aria-hidden="true">{hall}</span>}
        {seats.map(x => {
          const at = spot(x.i), label = `Seat ${x.i + 1}`;
          const style = { left: `${at.l}%`, top: `${at.t}%`, "--r": `${at.r}deg`, "--c": color(x), "--ci": personInk(color(x)) } as React.CSSProperties;
          const face = x.kind === "open"
            ? <span className={p.face}><span className={p.plus} aria-hidden="true">+</span><span className={p.nm}>{isOwner ? "Add a roommate" : "Open seat"}</span><span className={p.k}>{label}</span></span>
            : x.kind === "member"
              ? <span className={p.face}><span className={p.k}>{label}{x.m.role === "owner" && " · Host"}</span><span className={p.nm}>{x.m.display_name}</span><span className={p.k}>{x.m.role === "owner" ? (detail.ownerPro ? "Pro" : "Hosts the room") : roleLabel(x.m.role)}</span></span>
              : <span className={p.face}><span className={p.k}>{label} · Invited</span><span className={p.nm}>{x.inv.email.split("@")[0]}</span><span className={p.em}>{x.inv.email}</span></span>;
          const kind = x.kind === "member" ? "filled" : x.kind;
          const isFresh = x.kind === "pending" && x.inv.email.toLowerCase() === fresh;
          if (x.kind === "open" && !isOwner) return <span key={x.i} className={p.tag} data-kind={kind} style={style}>{face}</span>;
          const aria = x.kind === "open" ? `${label} is open. Invite someone` : x.kind === "pending" ? `${label}, invited ${x.inv.email}` : `${label}, ${nameOf(x.m)}${x.m.role === "owner" ? ", the host" : ""}`;
          return <button key={x.i} type="button" className={p.tag} data-kind={kind} data-fresh={isFresh || undefined} style={style} aria-label={aria} onClick={() => openSeat(x.i)}>{face}</button>;
        })}
      </div>
    </section>

    <section className={`${s.versions} ${p.versions}`} aria-labelledby="versions-title">
      <div className={s.versionsHead}><h2 id="versions-title">Versions</h2><span>Saved as you go</span></div>
      <p className={s.versionsLede}>A version every five minutes while you work, plus any you name. The latest 20 are kept.</p>
      {detail.canEdit && <form className={s.versionForm} onSubmit={async e => { e.preventDefault(); if (await run("checkpoint", { name: versionName })) setVersionName(""); }}>
        <label htmlFor="room-version-name">Keep a named version</label>
        <div><input id="room-version-name" required maxLength={80} value={versionName} onChange={e => setVersionName(e.target.value)} placeholder="The layout we both love" /><button type="submit" className={s.ghostBtn} disabled={busy || !versionName.trim()}>Save</button></div>
      </form>}
      <ol className={s.versionList}>
        {detail.versions.map(v => { const row = <>
          <span className={s.versionNum}>v{v.revision}</span>
          <span className={s.versionWhat}>{v.name}{isCurrent(v) && v === current && <span className={s.currentTag}>Current</span>}</span>
          <time dateTime={v.created_at} title={new Date(v.created_at).toLocaleString()}>{ago(v.created_at)}</time>
        </>; return <li key={v.id}>{detail.canEdit ? <button type="button" aria-pressed={selected === v.id} onClick={() => setSelected(selected === v.id ? null : v.id)}>{row}</button> : <div className={s.versionRow}>{row}</div>}</li>; })}
        {!detail.versions.length && <li className={s.columnEmpty}>Versions appear here as the room changes.</li>}
      </ol>
      <div className={s.versionFoot}>
        <p>Restoring keeps a copy of the current layout first. Nothing gets lost.</p>
        {detail.canEdit && <button type="button" className={s.inkBtn} disabled={busy || !chosen || isCurrent(chosen)} onClick={() => chosen && confirm(`restore:${chosen.id}`)}>{!chosen ? "Pick a version" : isCurrent(chosen) ? "This is the current version" : `Restore v${chosen.revision}`}</button>}
      </div>
    </section>

    {seat && <Modal className={p.layer} aria-labelledby="seat-title" onKeyDown={e => { if (e.key === "Escape") close(); }} onClick={close}>
      <div className={p.dlg} style={{ "--c": c } as React.CSSProperties} onClick={e => e.stopPropagation()}>
        <ModalClose className={p.x} onClick={close} disabled={busy} />
        <p className={p.dk}><i aria-hidden="true" />Seat {seat.i + 1} of {WORKSPACE_MEMBER_LIMIT}</p>
        {seat.kind === "open" && isOwner && <>
          <h2 id="seat-title">{openSeats === 1 ? <>Last seat <em>in the room.</em></> : <>Invite someone <em>to the room.</em></>}</h2>
          <p className={p.dl}>They join free with the email you invite, and they never spend your credits.</p>
          <form onSubmit={e => void send(e, seat.i)} noValidate>
            <div className={p.fld}><label className={p.lbl} htmlFor="room-invite-email">Email</label>
              <div className={p.box}><Mail /><input ref={emailField} id="room-invite-email" type="email" autoComplete="email" maxLength={254} placeholder="their@email.com" value={email} disabled={busy} onChange={e => { setEmail(e.target.value); setBad(""); }} aria-invalid={!!bad || undefined} aria-describedby={bad ? "room-invite-error" : undefined} /></div></div>
            <div className={p.fld}><span className={p.lbl} id="room-invite-access">Access</span>
              <div className={p.acc} data-role={role} role="group" aria-labelledby="room-invite-access"><span className={p.th} aria-hidden="true" />
                <button type="button" aria-pressed={role === "editor"} onClick={() => setRole("editor")}>Can edit</button>
                <button type="button" aria-pressed={role === "commenter"} onClick={() => setRole("commenter")}>Can comment</button></div>
              <p className={p.accD}>{ACCESS[role]}</p></div>
            {bad && <p id="room-invite-error" className={s.inlineError} role="alert">{bad}</p>}
            {acted && notice}
            <button type="submit" className={p.go} disabled={busy} aria-disabled={busy || (detail.ownerPro && !EMAIL_RE.test(email.trim()))}>
              {busy ? <><BrandLoader size="inline" />Sending…</> : detail.ownerPro ? <>Invite<Arrow /></> : "Unlock with Pro"}
            </button>
          </form>
          <p className={p.df}>Roommates usually get <strong>Can edit</strong>; a parent who wants a say gets <strong>Can comment</strong>. The invitation works only for that address and holds the seat for seven days.</p>
        </>}
        {seat.kind === "pending" && <>
          <h2 id="seat-title">Invite <em>sent.</em></h2>
          <div className={p.pend}><strong>{seat.inv.email}</strong><small>Invited · {seat.inv.role === "editor" ? "Can edit" : "Can comment"} · holds a seat until {until(seat.inv.expires_at)}</small></div>
          {acted && notice}
          <div className={p.row2}>
            <button type="button" className={p.ghost} disabled={busy || !detail.ownerPro} aria-label={`Resend invite to ${seat.inv.email}`} onClick={async () => { setActed(true); if (await onInvite(seat.inv.email, seat.inv.role)) { setOpen(null); setFresh(seat.inv.email.toLowerCase()); } }}>{busy ? <><BrandLoader size="inline" />Sending…</> : "Resend invite"}</button>
            <button type="button" className={p.danger} disabled={busy} aria-label={`Cancel invitation to ${seat.inv.email}`} onClick={async () => { setActed(true); if (await run("revoke", { invite_id: seat.inv.id })) setOpen(null); }}>Cancel</button>
          </div>
          <p className={p.df}>Sending again to the same email replaces the invitation.</p>
        </>}
        {seat.kind === "member" && <>
          <h2 id="seat-title">{seat.m.display_name} <em>{seat.m.role === "owner" ? "hosts." : `${roleLabel(seat.m.role).toLowerCase()}.`}</em></h2>
          <div className={p.pend}><strong>{nameOf(seat.m)}</strong><small>{seat.m.role === "owner" ? `Hosts this room${detail.ownerPro ? " · Pro" : ""}` : `${roleLabel(seat.m.role)} · ${ACCESS[seat.m.role]}`}</small></div>
          {seat.m.role !== "owner" && isOwner && <>
            <div className={p.fld}><label className={p.lbl} htmlFor="seat-access">Access</label>
              <select id="seat-access" className={p.select} disabled={busy} value={seat.m.role} onChange={e => { setActed(true); void run("member", { user_id: seat.m.user_id, role: e.target.value }); }}><option value="editor">Can edit</option><option value="commenter">Can comment</option></select></div>
            {acted && notice}
            <div className={p.row2}><button type="button" className={p.danger} disabled={busy} onClick={() => { setOpen(null); confirm(`remove:${seat.m.user_id}`); }}>Remove from room</button></div>
          </>}
          {seat.m.role === "owner" && <p className={p.df}>Pro hosts one shared room. Your personal rooms stay available on every plan.</p>}
        </>}
      </div>
    </Modal>}
  </div>;
});
export default PeoplePanel;

function Plus() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
}
function Mail() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3.5 7l8.5 6 8.5-6" /></svg>;
}
function Arrow() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" /></svg>;
}
