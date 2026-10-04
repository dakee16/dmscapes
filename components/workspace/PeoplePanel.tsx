"use client";
import { forwardRef, useState } from "react";
import type { WorkspaceDetail } from "@/lib/workspace";
import { WORKSPACE_MEMBER_LIMIT } from "@/lib/workspace";
import { ago, initial, personStyle, roleLabel } from "./people";
import s from "./Room.module.css";

type Props = {
  detail: WorkspaceDetail; userId: string; busy: boolean;
  onInvite: (email: string, role: "editor" | "commenter") => Promise<boolean>;
  onUpgrade: () => void;
  run: (action: string, payload?: Record<string, unknown>) => Promise<Record<string, unknown> | null>;
  confirm: (what: string) => void;
  notice: React.ReactNode;
};

/** People in the room, their access and invitations, room versions, and leaving or closing the room. */
const PeoplePanel = forwardRef<HTMLInputElement, Props>(function PeoplePanel({ detail, userId, busy, onInvite, onUpgrade, run, confirm, notice }, inviteField) {
  const isOwner = detail.role === "owner";
  const [email, setEmail] = useState(""), [role, setRole] = useState<"editor" | "commenter">("editor");
  const [selected, setSelected] = useState<string | null>(null), [versionName, setVersionName] = useState("");
  const invites = detail.invitations ?? [];
  const full = detail.members.length >= WORKSPACE_MEMBER_LIMIT;
  const current = detail.versions[0];
  const chosen = detail.versions.find(v => v.id === selected) ?? null;
  const isCurrent = (v: { revision: number }) => v.revision === detail.workspace.revision;
  return <div className={s.peopleWrap}><section className={s.people} aria-labelledby="people-title">
    <div className={s.peopleMain}>
      <div className={s.peopleHead}><h2 id="people-title" className={s.pageTitleSm}>People <em>in the room</em></h2><span className={s.seatCount}>{detail.members.length} of {WORKSPACE_MEMBER_LIMIT} seats</span></div>
      <p className={s.peopleLede}>Editors arrange the room and update who brings what. Commenters weigh in without moving the bed. Nobody needs Pro to join a Pro room.</p>
      <div className={s.seats}>
        {detail.members.map(m => <div key={m.user_id} className={s.seat}>
          <div className={s.seatWho}><span className={s.faceLg} style={personStyle(m.user_id, detail.members)} aria-hidden="true">{initial(m.display_name)}</span><span><strong>{m.display_name}{m.user_id === userId && <span> (you)</span>}</strong><small>{m.role === "owner" ? "Hosts this room" : m.role === "editor" ? "Arranges the room and the list" : "Reads and comments"}</small></span></div>
          <div className={s.seatFoot}>
            {m.role === "owner" ? <><span className={s.hostPill}>Host</span>{detail.ownerPro && <span className={s.proPill}>Pro</span>}</>
              : isOwner ? <><label><span className="ds-sr">Access for {m.display_name}</span><select disabled={busy} value={m.role} onChange={e => void run("member", { user_id: m.user_id, role: e.target.value })}><option value="editor">Can edit</option><option value="commenter">Can comment</option></select></label>
                <button type="button" className={s.removeBtn} disabled={busy} onClick={() => confirm(`remove:${m.user_id}`)}>Remove</button></>
              : <span className={s.rolePill}>{roleLabel(m.role)}</span>}
          </div>
        </div>)}
        {isOwner && invites.map(invite => <div key={invite.id} className={s.seat} data-pending="true">
          <div className={s.seatWho}><span className={s.facePending} aria-hidden="true">@</span><span><strong className={s.inviteEmail}>{invite.email}</strong><small>Invited · {invite.role === "editor" ? "Can edit" : "Can comment"} · holds a seat until {new Date(invite.expires_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></span></div>
          <div className={s.seatFoot}>
            <button type="button" className={s.ghostBtn} disabled={busy || !detail.ownerPro} onClick={() => void onInvite(invite.email, invite.role)} aria-label={`Resend invite to ${invite.email}`}>Resend invite</button>
            <button type="button" className={s.removeBtn} disabled={busy} aria-label={`Cancel invitation to ${invite.email}`} onClick={async () => { await run("revoke", { invite_id: invite.id }); }}>Cancel</button>
          </div>
        </div>)}
        {isOwner && !full && WORKSPACE_MEMBER_LIMIT - detail.members.length - invites.length <= 0 && <div className={s.seatInvite} data-held="true"><strong>Every seat is held</strong><small>Invitations hold a seat for seven days. Cancel one to invite someone else, or resend it if it got lost.</small></div>}
        {isOwner && !full && WORKSPACE_MEMBER_LIMIT - detail.members.length - invites.length > 0 && <form className={s.seatInvite} onSubmit={async e => { e.preventDefault(); if (!detail.ownerPro) { onUpgrade(); return; } if (await onInvite(email, role)) setEmail(""); }}>
          <label htmlFor="room-invite-email">{WORKSPACE_MEMBER_LIMIT - detail.members.length - invites.length === 1 ? "Last seat" : "Invite someone"}</label>
          <input ref={inviteField} id="room-invite-email" type="email" autoComplete="email" required maxLength={254} placeholder="their@email.com" value={email} onChange={e => setEmail(e.target.value)} disabled={busy} />
          <div><label><span className="ds-sr">Access</span><select disabled={busy} value={role} onChange={e => setRole(e.target.value as "editor" | "commenter")}><option value="editor">Can edit</option><option value="commenter">Can comment</option></select></label>
            <button type={detail.ownerPro ? "submit" : "button"} onClick={() => { if (!detail.ownerPro) onUpgrade(); }} className={s.inkBtn} disabled={busy}>{busy ? "Sending…" : detail.ownerPro ? "Invite" : "Unlock with Pro"}</button></div>
          <small>{role === "editor" ? "Can arrange the room, update shopping, and comment." : "Can view the room and shopping list, and leave comments."}</small>
        </form>}
      </div>
      {notice}
      {isOwner && <p className={s.inviteNote}>Invitations go by email and only work for that address. Each one holds a seat for seven days; sending again to the same email replaces it. {full && "Your room is full. Remove someone before inviting another person."}</p>}
      {isOwner && !detail.ownerPro && <p className={s.inviteNote}>Pro hosts one shared room. Your personal rooms stay available on every plan.</p>}
      <div className={s.infoCards}>
        <div className={s.infoInk}><h3>Credits stay yours</h3><p>Invitations use no credits, and guests never spend yours.</p></div>
        <div className={s.infoPaper}>{isOwner ? <>
          <h3>{detail.workspace.shared ? "Close this room" : "Delete this room"}</h3>
          <p>{detail.workspace.shared ? "Everyone loses access. Your room and shopping list stay saved." : "Personal rooms are private to you. Original saved designs stay in My designs."}</p>
          <div className={s.infoActions}>{detail.workspace.shared && <button type="button" className={s.dangerLink} onClick={() => confirm("personal")}>Make it personal</button>}<button type="button" className={s.dangerLink} onClick={() => confirm("delete")}>Delete workspace</button></div>
        </> : <>
          <h3>Leave this room</h3><p>This room belongs to its host. Your personal rooms are separate.</p>
          <div className={s.infoActions}><button type="button" className={s.dangerLink} onClick={() => confirm("leave")}>Leave room</button></div>
        </>}</div>
      </div>
    </div>
    <section className={s.versions} aria-labelledby="versions-title">
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
  </section></div>;
});
export default PeoplePanel;
