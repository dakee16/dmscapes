"use client";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { canBuild3D } from "@/lib/plan";
import { getBrowserClient } from "@/lib/supabase-browser";
import { usePlannerStore } from "@/lib/store";
import type { BuilderDraft } from "@/lib/room-builder";
import type { SelectedRoom } from "@/lib/types";
import BrandLoader from "@/components/site/BrandLoader";
import BuilderIllustration from "./BuilderIllustration";
import s from "./Builder.module.css";

const RoomBuilder=dynamic(()=>import("./RoomBuilder"),{ssr:false,loading:()=> <div className={s.loading}><BrandLoader label="Preparing your construction grid…"/></div>});
export default function BuilderEntry(){
  const {user,profile,loading,openAuthModal}=useAuth(),{openUpgrade}=useUpgrade(),router=useRouter();
  const [verified,setVerified]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const identity=useRef(user?.id);identity.current=user?.id;
  const pro=!loading&&canBuild3D(profile),uid=user?.id;
  async function request(draft?:BuilderDraft){
    const client=getBrowserClient(),token=(await client?.auth.getSession())?.data.session?.access_token;
    if(!token)throw Error("Sign in again to verify your Pro access. Your draft will stay on this device.");
    const result=await fetch("/api/room-builder",{method:draft?"POST":"GET",cache:"no-store",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},...(draft?{body:JSON.stringify(draft)}:{})});
    const data=await result.json();if(!result.ok)throw Error(data.error||"Could not verify this room. Please try again.");return data;
  }
  async function start(){
    if(loading||busy)return;
    if(!user){openAuthModal("profile");return;}
    if(!pro){openUpgrade("draw-3d");return;}
    setBusy(true);setError("");const id=user.id;
    try {await request();if(identity.current===id)setVerified(id);}catch(e){setError(e instanceof Error?e.message:"Could not open the builder. Try again.");}finally{setBusy(false);}
  }
  async function complete(draft:BuilderDraft){
    const id=identity.current;if(!id||!pro)throw Error("Pro access is required. Sign in with your Pro account.");
    const data=await request(draft) as {room:SelectedRoom};
    if(identity.current!==id)throw Error("Your account changed. Open the builder again to continue.");
    const planner=usePlannerStore.getState();planner.setCollege(null);planner.setRoom(data.room);planner.setPlannerView("3d");
    usePlannerStore.getState().startManual();
    router.push("/plan/result");
  }
  if(uid&&verified===uid&&pro)return <RoomBuilder key={uid} userId={uid} onComplete={complete}/>;
  return <section className={s.landing} aria-labelledby="builder-title">
    <div className={s.landingCopy}><p className={s.eyebrow}>New / Dormscape Pro</p><h1 id="builder-title">Your room.<br/><em>From the ground up.</em></h1><p className={s.lead}>Don’t just arrange a room. Build yours. Place a floor, shape the walls, and add doors, windows, and closets on a live 3D grid. Then make it home in the 3D planner.</p>
      <div className={s.actions}><button className={s.primary} onClick={start} disabled={loading||busy}>{loading?"Checking your account…":busy?"Opening your builder…":!user?"Sign in to build in 3D":pro?"Start building in 3D ↗":"Unlock 3D building with Pro ↗"}</button><Link href="/plan/draw">Prefer drawing in 2D?</Link></div>
      {error&&<p role="alert" className={s.error}>{error}</p>}
      <p className={s.fine}>Pro only. Existing 2D drawing remains included with Plus and Pro.</p>
    </div><BuilderIllustration/>
    <ol className={s.featureGrid}><li><span>01 / SHAPE</span><h2>A floor that fits.</h2><p>Start with a rectangle or trace a custom outline. Move corners and enter exact measurements.</p></li><li><span>02 / DETAILS</span><h2>Every little detail.</h2><p>Place doors and windows on your walls. Add built-in closets and set their exact size and position.</p></li><li><span>03 / FURNISH</span><h2>Built. Now make it yours.</h2><p>Your drawn room opens in 3D, ready to furnish. Choose a vibe and product matches whenever you are ready.</p></li></ol>
  </section>;
}
