"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { workspaceRequest } from "@/lib/workspace-client";
import RoomAppHeader from "@/components/workspace/RoomAppHeader";
import s from "@/components/workspace/Workspace.module.css";
export default function JoinRoomPage() {
  const { user, loading } = useAuth(), router = useRouter();
  const [token,setToken]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{setToken(location.hash.slice(1));},[]);
  async function join(){setBusy(true);setError("");try{const result=await workspaceRequest<{id:string}>("/api/workspaces/join",{method:"POST",body:JSON.stringify({token})});history.replaceState(null,"","/rooms/join");router.replace(`/rooms/${result.id}`);}catch(e){setError((e as Error).message);setBusy(false);}}
  return <><RoomAppHeader/><main className={s.dashboard}><section className={s.empty}><p className={s.eyebrow}>An invitation to make room</p><h1 style={{marginTop:18}}>Your room.<br/><em>Better together.</em></h1><p>Join your roommate to explore the layout, choose your favorites, and decide who brings what. Joining a Pro room is free.</p>{error&&<p role="alert" className={s.error}>{error}</p>}{!token?<p>This invitation is missing its link. Ask the room owner for a new one.</p>:loading?<p>Checking your account…</p>:user?<button className={s.primary} disabled={busy} onClick={()=>void join()}>{busy?"Joining…":"Join the room ↗"}</button>:<Link className={s.primary} href={`/login?next=${encodeURIComponent(`/rooms/join#${token}`)}`}>Sign in to join</Link>}</section></main></>;
}
