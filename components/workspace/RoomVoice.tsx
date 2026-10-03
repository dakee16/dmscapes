"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Room } from "livekit-client";
import { workspaceRequest } from "@/lib/workspace-client";
import type { WorkspaceMember } from "@/lib/workspace";
import { CloseIcon } from "@/components/ds/Icons";
import { initial, personStyle, roleLabel } from "./people";
import s from "./Room.module.css";

type Participant = { id: string; muted: boolean; speaking: boolean };
type VoiceState = {
  enabled: boolean;
  available: boolean | null;
  status: "idle" | "joining" | "joined" | "reconnecting";
  live: boolean;
  muted: boolean;
  toggling: boolean;
  error: string;
  audioBlocked: boolean;
  participants: Participant[];
  since: number | null;
  check: () => Promise<void>;
  join: (talk: boolean) => Promise<void>;
  leave: () => void;
  toggleMic: () => Promise<void>;
  startAudio: () => void;
  dismissError: () => void;
  /** True only while this person is actually connected to the room call. */
  inCall: (userId: string) => boolean;
};
const VoiceContext = createContext<VoiceState | null>(null);
export const useVoice = () => useContext(VoiceContext);

/** Room voice (LiveKit). One connection per tab; the header, the people rail and
 * the call panel all read it from here. Nothing is recorded. */
export function VoiceProvider({ id, epoch, enabled, children }: { id: string; epoch?: string; enabled: boolean; children: ReactNode }) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [status, setStatus] = useState<VoiceState["status"]>("idle");
  const [muted, setMuted] = useState(true), [error, setError] = useState(""), [audioBlocked, setAudioBlocked] = useState(false), [toggling, setToggling] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [since, setSince] = useState<number | null>(null);
  const room = useRef<Room | null>(null), audio = useRef<HTMLDivElement>(null), generation = useRef(0);
  const live = status === "joined" || status === "reconnecting";
  const dispose = () => { generation.current++; const current = room.current; room.current = null; if (current) { current.removeAllListeners(); void current.disconnect(true); } audio.current?.replaceChildren(); };
  useEffect(() => {
    setStatus("idle"); setParticipants([]); setMuted(true); setAvailable(null); setError(""); setSince(null);
    return dispose;
  }, [id, epoch, enabled]);
  async function check() {
    setError("");
    if (!enabled) { setAvailable(false); return; }
    try { const result = await workspaceRequest<{ available: boolean }>(`/api/workspaces/${id}/voice`); setAvailable(result.available); }
    catch (e) { setError((e as Error).message); }
  }
  function leave() { dispose(); setStatus("idle"); setParticipants([]); setMuted(true); setAudioBlocked(false); setSince(null); }
  async function join(talk: boolean) {
    if (status !== "idle") return;
    setStatus("joining"); setError(""); const run = ++generation.current;
    try {
      const [sdk, credentials] = await Promise.all([import("livekit-client"), workspaceRequest<{ url: string; token: string }>(`/api/workspaces/${id}/voice`, { method: "POST" })]);
      if (run !== generation.current) return;
      const current = new sdk.Room({ audioCaptureDefaults: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, disconnectOnPageLeave: true });
      room.current = current;
      const update = () => {
        if (run !== generation.current) return;
        const people = [current.localParticipant, ...current.remoteParticipants.values()];
        setParticipants(people.map(p => ({ id: p.identity, muted: !p.isMicrophoneEnabled, speaking: p.isSpeaking })));
        setMuted(!current.localParticipant.isMicrophoneEnabled);
      };
      current.on(sdk.RoomEvent.TrackSubscribed, track => { if (track.kind === sdk.Track.Kind.Audio && audio.current) audio.current.append(track.attach()); });
      current.on(sdk.RoomEvent.TrackUnsubscribed, track => track.detach().forEach(el => el.remove()));
      for (const event of [sdk.RoomEvent.ParticipantConnected, sdk.RoomEvent.ParticipantDisconnected, sdk.RoomEvent.TrackMuted, sdk.RoomEvent.TrackUnmuted, sdk.RoomEvent.LocalTrackPublished, sdk.RoomEvent.LocalTrackUnpublished, sdk.RoomEvent.ActiveSpeakersChanged]) current.on(event, update);
      current.on(sdk.RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!current.canPlaybackAudio));
      current.on(sdk.RoomEvent.Reconnecting, () => { setStatus("reconnecting"); });
      current.on(sdk.RoomEvent.Reconnected, () => { setStatus("joined"); update(); });
      current.on(sdk.RoomEvent.Disconnected, () => { if (run !== generation.current) return; dispose(); setStatus("idle"); setParticipants([]); setMuted(true); setSince(null); setError("Voice disconnected. Join again when you're ready."); });
      await current.connect(credentials.url, credentials.token);
      if (run !== generation.current) { void current.disconnect(true); return; }
      await current.startAudio().catch(() => setAudioBlocked(true));
      if (run !== generation.current) { void current.disconnect(true); return; }
      if (talk) { try { await current.localParticipant.setMicrophoneEnabled(true); } catch { setError("Microphone unavailable. You've joined to listen. Allow microphone access, then unmute."); } }
      if (run !== generation.current) { void current.disconnect(true); return; }
      setStatus("joined"); setSince(Date.now()); update();
    } catch (e) {
      if (run !== generation.current) return;
      dispose(); setStatus("idle"); setError(e instanceof Error ? e.message : "Couldn't join voice. Please try again.");
    }
  }
  async function toggleMic() {
    const current = room.current; if (!current || toggling) return;
    setToggling(true); setError("");
    try { await current.localParticipant.setMicrophoneEnabled(!current.localParticipant.isMicrophoneEnabled); if (room.current === current) setMuted(!current.localParticipant.isMicrophoneEnabled); }
    catch { setError("Couldn't access your microphone. Check your browser permission and try again."); }
    finally { setToggling(false); }
  }
  const value: VoiceState = { enabled, available, status, live, muted, toggling, error, audioBlocked, participants, since,
    check, join, leave, toggleMic, startAudio: () => void room.current?.startAudio().catch(() => setError("Your browser blocked audio. Check its sound settings.")),
    dismissError: () => setError(""), inCall: uid => live && participants.some(p => p.id === uid) };
  return <VoiceContext.Provider value={value}>{children}<div ref={audio} hidden /></VoiceContext.Provider>;
}

export function MicIcon({ muted = false, size = 16 }: { muted?: boolean; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" />{muted && <path d="M3 3l18 18" />}</svg>;
}
export function HeadsetIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 14v-2a8 8 0 0 1 16 0v2" /><rect x="3" y="14" width="4" height="6" rx="1.5" /><rect x="17" y="14" width="4" height="6" rx="1.5" /></svg>;
}
export function HangUpIcon({ size = 16 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 15c5-5 13-5 18 0l-2 3-4-1v-3a10 10 0 0 0-6 0v3l-4 1z" /></svg>;
}
function Bars() { return <span className={s.bars} aria-hidden="true"><i /><i /><i /></span>; }

/** mm:ss since this tab joined the call. */
export function useCallClock(since: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { if (!since) return; const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, [since]);
  if (!since) return "";
  const sec = Math.max(0, Math.floor((now - since) / 1000));
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** The call control in the room header: join, or the live pill with mute and leave. */
export function CallControl({ onOpen, open }: { onOpen: () => void; open: boolean }) {
  const v = useVoice(); const clock = useCallClock(v?.since ?? null);
  if (!v) return null;
  if (v.live) return <div className={s.callPill} role="group" aria-label="Room call">
    <Bars />
    <button type="button" className={s.callPillLabel} onClick={onOpen} aria-expanded={open} aria-controls="room-side-panel">{v.status === "reconnecting" ? "Reconnecting…" : "Room call"} <span className={s.callClock}>{clock}</span></button>
    <button type="button" className={s.callRound} aria-pressed={!v.muted} aria-label={v.muted ? "Unmute" : "Mute"} disabled={v.toggling || v.status === "reconnecting"} onClick={() => void v.toggleMic()}><MicIcon muted={v.muted} /></button>
    <button type="button" className={`${s.callRound} ${s.callLeave}`} aria-label="Leave the call" onClick={v.leave}><HangUpIcon /></button>
  </div>;
  return <button type="button" className={s.joinCall} aria-label="Join room call" onClick={onOpen} aria-expanded={open} aria-controls="room-side-panel"><HeadsetIcon /><span className={s.joinCallText}>Join room call</span></button>;
}

/** The night call panel: who's in, who isn't, follow a view, mute and leave. */
export function VoicePanel({ members, userId, roomName, onClose, following, onFollow }: {
  members: WorkspaceMember[]; userId: string; roomName: string; onClose: () => void;
  following: string | null; onFollow: (id: string | null) => void;
}) {
  const v = useVoice(); const clock = useCallClock(v?.since ?? null);
  const checked = useRef(false);
  useEffect(() => { if (v && !checked.current && !v.live) { checked.current = true; void v.check(); } }, [v]);
  if (!v) return null;
  const inCall = v.participants.map(p => ({ ...p, member: members.find(m => m.user_id === p.id) }));
  const outside = members.filter(m => !v.participants.some(p => p.id === m.user_id));
  const talker = inCall.find(p => p.id !== userId && p.member);
  return <section className={`${s.sidePanel} ${s.voicePanel}`} id="room-side-panel" aria-labelledby="room-call-title">
    <header className={s.voiceHead}>
      <span className={s.voiceDot} aria-hidden="true" />
      <h2 id="room-call-title">Room call</h2>
      {v.live && <span className={s.voiceClock}>{clock}</span>}
      <button type="button" className={s.panelClose} aria-label="Close room call" onClick={() => { if (v.status === "joining") v.leave(); onClose(); }}><CloseIcon size={18} /></button>
    </header>
    <p className={s.voiceSub}>Only people in {roomName} can join. Audio only, up to four of you. Dormscape doesn&apos;t record calls.</p>
    {v.live ? <>
      <div className={s.voiceTiles}>{inCall.map(p => <div key={p.id} className={s.voiceTile}>
        <span className={s.voiceFace} data-speaking={p.speaking && !p.muted} style={personStyle(p.id, members)}>{initial(p.member?.display_name ?? "?")}{p.muted && <i className={s.voiceMuted} aria-hidden="true"><MicIcon muted size={13} /></i>}</span>
        <span className={s.voiceName}>{p.id === userId ? "You" : p.member?.display_name ?? "Roommate"} <small>· {p.muted ? "muted" : p.speaking ? "talking" : p.id === userId ? "mic on" : "listening"}</small></span>
      </div>)}</div>
      {outside.map(m => <div key={m.user_id} className={s.voiceOut}>
        <span className={s.voiceOutFace} style={personStyle(m.user_id, members)}>{initial(m.display_name)}</span>
        <span><strong>{m.display_name} isn&apos;t in the call</strong><small>{roleLabel(m.role)} · joins from the room header</small></span>
      </div>)}
      {talker && <><p className={s.voiceLabel}>While you talk</p>
        <button type="button" role="switch" aria-checked={following === talker.id} className={s.voiceSwitch} onClick={() => onFollow(following === talker.id ? null : talker.id)}>Follow {talker.member!.display_name}&apos;s view<span className={s.switch} data-on={following === talker.id} aria-hidden="true" /></button></>}
      {v.audioBlocked && <button type="button" className={s.voiceAudio} onClick={v.startAudio}>Enable room audio</button>}
      <div className={s.voiceControls}>
        <button type="button" className={s.voiceMute} aria-pressed={v.muted} disabled={v.toggling || v.status === "reconnecting"} onClick={() => void v.toggleMic()}><MicIcon muted={v.muted} size={18} />{v.muted ? "Unmute" : "Mute"}</button>
        <button type="button" className={s.voiceLeave} aria-label="Leave the call" onClick={v.leave}><HangUpIcon size={22} /></button>
      </div>
      <p className={s.voiceHint}>{v.muted ? "Your microphone is off." : "Your microphone is on."} No recording.</p>
    </> : <>
      <div className={s.voiceArt} aria-hidden="true">{members.slice(0, 4).map(m => <span key={m.user_id} style={personStyle(m.user_id, members)}>{initial(m.display_name)}</span>)}</div>
      <h3 className={s.voiceTitle}>Talk it <em>through.</em></h3>
      <p className={s.voiceBody}>Hop in while you plan. You can move things around while you talk.</p>
      {v.available === false ? <p className={s.voiceSetup}>{v.enabled ? "Voice hasn't been connected for this environment yet. Comments and room planning are still available." : "Room voice is for shared rooms hosted with Pro. Invite a roommate to start planning together."}</p>
        : <div className={s.voiceJoin}>
          <button type="button" className={s.voiceJoinMain} disabled={v.available !== true || v.status === "joining"} onClick={() => void v.join(false)}>{v.status === "joining" ? "Joining…" : v.available === null ? "Checking voice…" : "Join with mic off"}</button>
          <button type="button" className={s.voiceJoinTalk} disabled={v.available !== true || v.status === "joining"} onClick={() => void v.join(true)}><MicIcon size={18} />Join and talk</button>
        </div>}
      <p className={s.voiceHint}>Your mic is only requested if you choose to talk. You can mute or leave at any time.</p>
    </>}
    {v.error && <p className={s.voiceError} role="alert">{v.error}</p>}
  </section>;
}

/** A dismissible note when voice drops while the panel is closed. */
export function VoiceToast({ hidden }: { hidden: boolean }) {
  const v = useVoice();
  if (!v || hidden || v.live || !v.error) return null;
  return <div className={s.voiceToast} role="status">{v.error}<button type="button" onClick={v.dismissError} aria-label="Dismiss voice message"><CloseIcon size={16} /></button></div>;
}
