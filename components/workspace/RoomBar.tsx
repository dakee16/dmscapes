"use client";
import Link from "next/link";
import Wordmark from "@/components/site/Wordmark";
import type { WorkspaceDetail } from "@/lib/workspace";
import { WORKSPACE_MEMBER_LIMIT } from "@/lib/workspace";
import { ChevronLeft, PlusIcon } from "@/components/studio-ui/icons";
import { useCollaboration } from "./CollaborationProvider";
import { CallControl, useVoice } from "./RoomVoice";
import { initial, personStyle, roleLabel } from "./people";
import type { RoomTab } from "./RoomWorkspacePage";
import s from "./Room.module.css";

export function CommentIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 5h16v11H9l-5 4z" /></svg>;
}

/** The room header: name, where it is, the three views, who's here, the call, invite. */
export default function RoomBar({ detail, userId, name, place, status, tab, setTab, badges, side, openSide, onInvite, canRename, onRename }: {
  detail: WorkspaceDetail; userId: string; name: string; place: string; status: { label: string; full: string; state: string };
  tab: RoomTab; setTab: (t: RoomTab) => void; badges: Partial<Record<RoomTab, number>>;
  side: "comments" | "voice" | null; openSide: (p: "comments" | "voice" | null) => void;
  onInvite: () => void; canRename: boolean; onRename: (name: string) => void;
}) {
  const live = useCollaboration(), voice = useVoice();
  const enabled = detail.workspace.shared && detail.ownerPro;
  const openCount = detail.comments.filter(c => !c.parent_id && !c.resolved).length;
  const isOwner = detail.role === "owner";
  const tabs: [RoomTab, string, string][] = [["room", "Room plan", "Plan"], ["shopping", "Who brings what", "Who brings"], ["roommates", "People", "People"]];
  return <header className={s.bar}>
    <Link href="/rooms" className={s.barBack} aria-label="Back to My designs"><ChevronLeft size={22} /></Link>
    <Wordmark className={s.barMark} />
    <span className={s.barRule} aria-hidden="true" />
    <div className={s.barTitle}>
      <div className={s.barName}>
        {canRename ? <input aria-label="Room name" key={name} defaultValue={name} maxLength={80} onBlur={e => { const next = e.target.value.trim(); if (next) onRename(next); else e.target.value = name; }} onKeyDown={e => { if (e.key === "Enter") e.currentTarget.blur(); }} /> : <h1>{name}</h1>}
        <span className={s.barTag}>{enabled ? "My Room" : "Personal"}</span>
      </div>
      <p className={s.barMeta}><span>{place}</span><span className={s.saveState} data-state={status.state} role="status" title={status.full}><i aria-hidden="true" /><span aria-hidden="true">{status.label}</span><span className="ds-sr">{status.full}</span></span></p>
    </div>
    <nav className={s.tabs} aria-label="Room views">
      {tabs.map(([key, label, short]) => <button key={key} type="button" aria-current={tab === key ? "page" : undefined} onClick={() => setTab(key)}>
        <span className={s.tabLong}>{label}</span><span className={s.tabShort}>{short}</span>
        {!!badges[key] && <b aria-label={`${badges[key]} open`}>{badges[key]}</b>}
      </button>)}
    </nav>
    <div className={s.barRight}>
      <div className={s.faces} role="group" aria-label="In this room">
        {detail.members.slice(0, WORKSPACE_MEMBER_LIMIT).map(m => {
          const here = live?.status === "live" && !!live.peers[m.user_id]?.active;
          const onCall = voice?.inCall(m.user_id) ?? false;
          return <span key={m.user_id} className={s.face} data-here={here || m.user_id === userId} data-call={onCall} style={personStyle(m.user_id, detail.members)} title={`${m.display_name}${m.user_id === userId ? " (you)" : ""} · ${roleLabel(m.role).toLowerCase()} · ${onCall ? "in the call" : m.user_id === userId || here ? "here now" : "away"}`}>
            {initial(m.display_name)}<span className="ds-sr">{m.display_name}{m.user_id === userId ? " (you)" : ""}, {onCall ? "in the call" : here ? "here now" : "away"}</span>
          </span>;
        })}
      </div>
      {enabled && <CallControl open={side === "voice"} onOpen={() => openSide(side === "voice" ? null : "voice")} />}
      <button type="button" className={s.barComments} aria-label={`Comments${openCount ? `, ${openCount} open` : ""}`} aria-expanded={side === "comments"} aria-controls="room-side-panel" onClick={() => openSide(side === "comments" ? null : "comments")}>
        <CommentIcon /><span className={s.barCommentsText} aria-hidden="true">Comments</span>{openCount > 0 && <b aria-hidden="true">{openCount}</b>}
      </button>
      {isOwner && <button type="button" className={s.invite} aria-label="Invite people" onClick={onInvite}><PlusIcon size={16} /><span className={s.inviteText}>Invite</span></button>}
    </div>
  </header>;
}
