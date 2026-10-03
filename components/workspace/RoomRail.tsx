"use client";
import type { WorkspaceDetail } from "@/lib/workspace";
import { WORKSPACE_MEMBER_LIMIT } from "@/lib/workspace";
import type { RoomPresence } from "@/lib/workspace-collaboration";
import { usePlannerStore } from "@/lib/store";
import { useCollaboration } from "./CollaborationProvider";
import { useVoice } from "./RoomVoice";
import { initial, personStyle, roleLabel } from "./people";
import s from "./Room.module.css";

/** Where someone is in the room, in a few words. */
function where(p: RoomPresence | undefined, connected: boolean) {
  if (!connected) return "";
  if (!p) return "away";
  if (!p.active) return "idle";
  return p.section === "shopping" ? "on who brings what" : p.section === "roommates" ? "on people" : p.view === "3d" ? "in 3D" : "on the plan";
}
function Switch({ label, on, onChange, disabled, hint }: { label: string; on: boolean; onChange: (v: boolean) => void; disabled?: boolean; hint?: string }) {
  return <button type="button" role="switch" aria-checked={on} disabled={disabled} className={s.railSwitch} onClick={() => onChange(!on)} title={hint}>
    {label}<span className={s.switch} data-on={on} aria-hidden="true" />
  </button>;
}

/** The left rail beside the plan: what shows on it, and who's in the room. */
export default function RoomRail({ detail, userId, overlay, setOverlay, following, onFollow, onInvite, onPeople }: {
  detail: WorkspaceDetail; userId: string;
  overlay: { pins: boolean; cursors: boolean }; setOverlay: (o: { pins: boolean; cursors: boolean }) => void;
  following: string | null; onFollow: (id: string | null) => void; onInvite: () => void; onPeople: () => void;
}) {
  const live = useCollaboration(), voice = useVoice();
  const showOwners = usePlannerStore(st => st.planning.showOwners);
  const enabled = detail.workspace.shared && detail.ownerPro;
  const seats = WORKSPACE_MEMBER_LIMIT - detail.members.length - (detail.invitations?.length ?? 0);
  const isOwner = detail.role === "owner";
  const talking = (id: string) => voice?.participants.some(p => p.id === id && p.speaking && !p.muted);
  return <aside className={s.rail} aria-label="Room filters and people">
    <p className={s.railLabel}>Show on the plan</p>
    <div className={s.railSwitches}>
      <Switch label="Owner colors" on={showOwners} disabled={!detail.canEdit} hint={detail.canEdit ? undefined : "Editors choose whether owners show on the plan"} onChange={v => usePlannerStore.getState().updatePlanning({ showOwners: v })} />
      <Switch label="Comment pins" on={overlay.pins} onChange={v => setOverlay({ ...overlay, pins: v })} />
      <Switch label="Everyone's cursors" on={overlay.cursors} disabled={!enabled} onChange={v => setOverlay({ ...overlay, cursors: v })} />
    </div>
    <div className={s.railRule} />
    <p className={s.railLabel}><span>In this room</span><span>{detail.members.length} of {WORKSPACE_MEMBER_LIMIT}</span></p>
    <ul className={s.railPeople}>
      {detail.members.map(m => {
        const me = m.user_id === userId, peer = live?.peers[m.user_id];
        const onCall = voice?.inCall(m.user_id) ?? false;
        const here = me || (live?.status === "live" && !!peer?.active);
        const state = onCall ? (talking(m.user_id) ? "talking" : "in the call") : me ? "here" : !enabled ? "" : where(peer, live?.status === "live");
        const canFollow = !me && live?.status === "live" && !!peer?.active;
        return <li key={m.user_id}>
          <span className={s.railFace} data-here={here} data-call={onCall} style={personStyle(m.user_id, detail.members)} aria-hidden="true">{initial(m.display_name)}</span>
          <span className={s.railWho}><strong>{m.display_name}{me && <span> (you)</span>}</strong><small>{roleLabel(m.role)}{state && ` · ${state}`}</small></span>
          {canFollow && <button type="button" className={s.follow} aria-pressed={following === m.user_id} style={personStyle(m.user_id, detail.members)} onClick={() => onFollow(following === m.user_id ? null : m.user_id)}>{following === m.user_id ? "Following" : "Follow"}</button>}
        </li>;
      })}
      {isOwner && seats > 0 && <li><button type="button" className={s.railSeat} onClick={onInvite}><span aria-hidden="true">+</span>{seats} seat{seats === 1 ? "" : "s"} left · invite</button></li>}
      {!isOwner && <li><button type="button" className={s.railSeat} onClick={onPeople}><span aria-hidden="true">+</span>See everyone&apos;s access</button></li>}
    </ul>
    {enabled && live?.status === "offline" && <button type="button" className={s.railRetry} onClick={live.reconnect}>Reconnect live presence</button>}
    <p className={s.railNote}>Invitations use no credits. Guests never spend yours.</p>
  </aside>;
}
