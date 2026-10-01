"use client";
import { useEffect,useRef,useState } from "react";
import type { Room } from "livekit-client";
import Modal from "@/components/site/Modal";
import { workspaceRequest } from "@/lib/workspace-client";
import { collaboratorColor } from "@/lib/workspace-collaboration";
import type { WorkspaceMember } from "@/lib/workspace";
import s from "./Collaboration.module.css";

export default function RoomVoice({id,epoch,members,enabled,userId}:{id:string;epoch?:string;members:WorkspaceMember[];enabled:boolean;userId:string}) {
  const [open,setOpen]=useState(false),[available,setAvailable]=useState<boolean|null>(null);
  const [status,setStatus]=useState<"idle"|"joining"|"joined"|"reconnecting">("idle");
  const [muted,setMuted]=useState(true),[error,setError]=useState(""),[audioBlocked,setAudioBlocked]=useState(false),[toggling,setToggling]=useState(false);
  const [participants,setParticipants]=useState<{id:string;muted:boolean;speaking:boolean}[]>([]);
  const room=useRef<Room|null>(null),audio=useRef<HTMLDivElement>(null),generation=useRef(0);
  const isLive=status==="joined"||status==="reconnecting";
  const dispose=()=>{generation.current++;const current=room.current;room.current=null;if(current){current.removeAllListeners();void current.disconnect(true);}audio.current?.replaceChildren();};
  useEffect(()=>{
    setStatus("idle");setParticipants([]);setMuted(true);setOpen(false);setAvailable(null);setError("");
    return dispose;
  },[id,epoch,enabled]);
  async function show() {
    setOpen(true);setError("");
    if(!enabled){setAvailable(false);return;}
    try {const result=await workspaceRequest<{available:boolean}>(`/api/workspaces/${id}/voice`);setAvailable(result.available);}
    catch(e){setError((e as Error).message);}
  }
  function leave(){dispose();setStatus("idle");setParticipants([]);setMuted(true);setAudioBlocked(false);setOpen(false);}
  async function join(talk:boolean) {
    if(status!=="idle")return;
    setStatus("joining");setError("");const run=++generation.current;
    try {
      const [sdk,credentials]=await Promise.all([import("livekit-client"),workspaceRequest<{url:string;token:string}>(`/api/workspaces/${id}/voice`,{method:"POST"})]);
      if(run!==generation.current)return;
      const current=new sdk.Room({audioCaptureDefaults:{echoCancellation:true,noiseSuppression:true,autoGainControl:true},disconnectOnPageLeave:true});
      room.current=current;
      const update=()=>{
        if(run!==generation.current)return;
        const people=[current.localParticipant,...current.remoteParticipants.values()];
        setParticipants(people.map(p=>({id:p.identity,muted:!p.isMicrophoneEnabled,speaking:p.isSpeaking})));
        setMuted(!current.localParticipant.isMicrophoneEnabled);
      };
      current.on(sdk.RoomEvent.TrackSubscribed,track=>{if(track.kind===sdk.Track.Kind.Audio && audio.current)audio.current.append(track.attach());});
      current.on(sdk.RoomEvent.TrackUnsubscribed,track=>track.detach().forEach(el=>el.remove()));
      for(const event of [sdk.RoomEvent.ParticipantConnected,sdk.RoomEvent.ParticipantDisconnected,sdk.RoomEvent.TrackMuted,sdk.RoomEvent.TrackUnmuted,sdk.RoomEvent.LocalTrackPublished,sdk.RoomEvent.LocalTrackUnpublished,sdk.RoomEvent.ActiveSpeakersChanged])current.on(event,update);
      current.on(sdk.RoomEvent.AudioPlaybackStatusChanged,()=>setAudioBlocked(!current.canPlaybackAudio));
      current.on(sdk.RoomEvent.Reconnecting,()=>{setStatus("reconnecting");});
      current.on(sdk.RoomEvent.Reconnected,()=>{setStatus("joined");update();});
      current.on(sdk.RoomEvent.Disconnected,()=>{if(run!==generation.current)return;dispose();setStatus("idle");setParticipants([]);setMuted(true);setError("Voice disconnected. Join again when you're ready.");});
      await current.connect(credentials.url,credentials.token);
      if(run!==generation.current){void current.disconnect(true);return;}
      await current.startAudio().catch(()=>setAudioBlocked(true));
      if(run!==generation.current){void current.disconnect(true);return;}
      if(talk){try{await current.localParticipant.setMicrophoneEnabled(true);}catch{setError("Microphone unavailable. You've joined to listen. Allow microphone access, then unmute.");}}
      if(run!==generation.current){void current.disconnect(true);return;}
      setStatus("joined");setOpen(false);update();
    }catch(e){
      if(run!==generation.current)return;
      dispose();setStatus("idle");setError(e instanceof Error?e.message:"Couldn't join voice. Please try again.");
    }
  }
  async function toggleMic(){
    const current=room.current;if(!current||toggling)return;
    setToggling(true);setError("");
    try{await current.localParticipant.setMicrophoneEnabled(!current.localParticipant.isMicrophoneEnabled);if(room.current===current)setMuted(!current.localParticipant.isMicrophoneEnabled);}
    catch{setError("Couldn't access your microphone. Check your browser permission and try again.");}
    finally{setToggling(false);}
  }
  return <>
    <button className={s.voiceButton} onClick={()=>void show()} aria-expanded={open}><MicIcon/>{isLive?"In voice":"Room voice"}{isLive&&<span className={s.liveDot}/>}</button>
    <div ref={audio} hidden/>
    {isLive&&<aside className={s.voiceDock} aria-label="Active room voice"><div className={s.voiceDockTitle}><span className={s.liveDot}/><strong>{status==="reconnecting"?"Reconnecting voice…":"Room voice"}</strong><span>{participants.length}/4</span></div>
      <div className={s.voicePeople}>{participants.map(p=>{const member=members.find(m=>m.user_id===p.id);return <span key={p.id} data-speaking={p.speaking&&!p.muted} style={{"--person-color":collaboratorColor(p.id,members.map(m=>m.user_id))} as React.CSSProperties} title={`${member?.display_name??"Roommate"}${p.id===userId?" (you)":""} · ${p.muted?"Muted":p.speaking?"Speaking":"Listening"}`}>{(member?.display_name??"?").slice(0,2).toUpperCase()}<small>{p.muted?"×":"•"}</small></span>;})}</div>
      <div className={s.voiceControls}><button disabled={toggling||status==="reconnecting"} aria-pressed={!muted} onClick={()=>void toggleMic()}><MicIcon muted={muted}/>{muted?"Unmute":"Mute"}</button><button className={s.leaveVoice} onClick={leave}>Leave</button></div>
      {audioBlocked&&<button className={s.enableAudio} onClick={()=>void room.current?.startAudio().catch(()=>setError("Your browser blocked audio. Check its sound settings."))}>Enable room audio</button>}
      <p className={s.voiceHint}>{muted?"Your microphone is off.":"Your microphone is on."} No recording.</p>
      {error&&<p className={s.inlineError} role="alert">{error}</p>}
    </aside>}
    {!isLive&&!open&&error&&<div className={s.voiceToast} role="status">{error}<button onClick={()=>setError("")} aria-label="Dismiss voice message">×</button></div>}
    {open&&<Modal className={s.voiceModal} aria-labelledby="room-voice-title" onClick={()=>{if(status!=="joining")setOpen(false);}} onKeyDown={e=>{if(e.key==="Escape"){e.stopPropagation();if(status==="joining")leave();else setOpen(false);}}}><div className={s.voiceDialog} onClick={e=>e.stopPropagation()}><button className={s.close} aria-label="Close room voice" onClick={()=>status==="joining"?leave():setOpen(false)}>×</button><div className={s.voiceArt} aria-hidden="true"><i/><i/><i/><i/><i/><i/><i/></div><p className={s.eyebrow}>A little room to talk</p><h2 id="room-voice-title">Talk it <em>through.</em></h2><p>Hop in while you plan. Audio only, up to four roommates. Dormscape does not record your call.</p>
      {isLive?<><p>You&apos;re already in room voice.</p><button className={s.primary} onClick={()=>setOpen(false)}>Back to the room</button></>:available===false?<p className={s.setupNote}>{enabled?"Voice hasn't been connected for this environment yet. Comments and room planning are still available.":"Room voice is for shared rooms hosted with Pro. Invite a roommate to start planning together."}</p>:<div className={s.joinChoices}><button className={s.primary} disabled={available!==true||status==="joining"} onClick={()=>void join(false)}>{status==="joining"?"Joining…":"Join with mic off"}</button><button className={s.outlineButton} disabled={available!==true||status==="joining"} onClick={()=>void join(true)}>Join and talk</button></div>}
      <p className={s.voiceHint}>Your mic is only requested if you choose to talk. You can mute or leave at any time.</p>{error&&<p className={s.inlineError} role="alert">{error}</p>}
    </div></Modal>}
  </>;
}
function MicIcon({muted=false}:{muted?:boolean}){return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="9" y="2" width="6" height="13" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>{muted&&<path d="M3 3l18 18"/>}</svg>;}
