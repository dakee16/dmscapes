"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { canBuild3D, PRO_PRICE_USD } from "@/lib/plan";
import { getBrowserClient } from "@/lib/supabase-browser";
import { usePlannerStore } from "@/lib/store";
import type { BuilderDraft } from "@/lib/room-builder";
import type { SelectedRoom } from "@/lib/types";
import BrandLoader from "@/components/site/BrandLoader";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import CtaBand from "@/components/ds/CtaBand";
import { ArrowRight, Check } from "@/components/ds/Icons";
import BuilderIllustration from "./BuilderIllustration";
import s from "./Builder.module.css";

const RoomBuilder=dynamic(()=>import("./RoomBuilder"),{ssr:false,loading:()=> <div className={s.loading}><div className={s.loaderCard}><BrandLoader label="Preparing your construction grid…"/></div></div>});

const STEPS=[
  {n:"01 / SHAPE",title:"A floor that fits.",text:"Start with a rectangle or trace a custom outline. Move corners and enter exact measurements.",kind:"shape"},
  {n:"02 / DETAILS",title:"Every little detail.",text:"Place doors and windows on your walls. Add built-in closets and set their exact size and position.",kind:"details"},
  {n:"03 / FURNISH",title:"Built. Now make it yours.",text:"Your drawn room opens in 3D, ready to furnish. Choose a vibe and product matches whenever you are ready.",kind:"furnish"},
] as const;
const SHAPES=[["rectangle","Rectangle"],["l","L-shape"],["alcove","Alcove"],["angled","Angled wall"]] as const;
/** What the builder hands to the planner (content/builder-faq: "Will my doors, windows, and measurements transfer"). */
const CARRIES=["Room outline","Opening positions and widths","Door swings","Closet footprints","Ceiling height","Floor finish","Wall color","Occupancy","Mattress size"];

export default function BuilderEntry({children}:{children?:ReactNode}){
  const {user,profile,loading,openAuthModal}=useAuth(),{openUpgrade}=useUpgrade(),router=useRouter();
  const [verified,setVerified]=useState<string|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const [origin,setOrigin]=useState<"hero"|"cta">("hero");
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
  const open=Boolean(uid&&verified===uid&&pro);
  // The builder replaces the landing in place; start it at the top of the page.
  useEffect(()=>{if(open)window.scrollTo({top:0});},[open]);
  if(open&&uid)return <><RoomBuilder key={uid} userId={uid} onComplete={complete}/>{children}</>;

  const startLabel=loading?"Checking your account…":busy?"Opening your builder…":!user?"Sign in to build in 3D":pro?"Start building in 3D":"Unlock 3D building with Pro";
  return <>
    <PageHero
      bg="var(--ds-night)"
      tone="dark"
      className={s.hero}
      titleId="builder-title"
      eyebrow={<span className={s.heroEyebrow}><span className={`ds-tag ${s.newTag}`}>New</span>Dormscape Pro · 3D Room Builder</span>}
      lines={[{text:"Your room."},{text:"From the ground up.",serif:true}]}
      lede={<p>Don’t just arrange a room. Build yours. Place a floor, shape the walls, and add doors, windows, and closets on a live 3D grid. Then make it home in the 3D planner.</p>}
      art={{src:"/redesign/site-builder-under-construction.jpg",alt:"A room under construction on a dark stage: the back wall built with a window, the left wall rising, the right wall a glowing blue outline, and a dragged corner labelled 16.4 feet",ratio:1,position:"50% 50%"}}
    >
      <button type="button" className={`ds-btn ds-btn--yellow ds-btn--lg ${s.startBtn}`} onClick={()=>{setOrigin("hero");start();}} disabled={loading||busy}>{startLabel}<ArrowRight/></button>
      <Link href="/plan/draw" className={`ds-link ${s.twoD}`}>Prefer drawing in 2D?</Link>
      {error&&origin==="hero"&&<p role="alert" className={s.heroError}>{error}</p>}
      <p className={s.heroFine}>Pro only. Existing 2D drawing remains included with Plus and Pro.</p>
    </PageHero>

    <section className={s.stepsSection} aria-labelledby="builder-steps">
      <div className="ds-wrap">
        <p className={s.darkEyebrow}>Floor <ArrowRight size={13} strokeWidth={2.4}/> Walls <ArrowRight size={13} strokeWidth={2.4}/> Your world · Live construction</p>
        <Headline id="builder-steps" className={`ds-h2 ${s.darkH2}`} lines={[{text:"The room starts with you."}]}/>
        <ol className={s.stepGrid}>
          {STEPS.map((step,i)=><li key={step.n} className={s.stepCard} data-reveal="" style={{"--i":i} as React.CSSProperties}>
            <span className={s.stepNum}>{step.n}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
            <BuilderIllustration kind={step.kind}/>
          </li>)}
        </ol>
      </div>
    </section>

    <section className={s.shapesSection} aria-labelledby="builder-shapes">
      <div className="ds-wrap">
        <Headline id="builder-shapes" className={`ds-h2 ds-h2--inline ${s.darkH2}`} lines={[{text:"Any shape,"},{text:"one closed outline.",serif:true}]}/>
        <p className={s.sectionLede}>Build a single connected, single-level room with a closed outline, including rectangles, L-shapes, alcoves, and angled walls.</p>
        <ul className={s.shapeGrid}>
          {SHAPES.map(([kind,label],i)=><li key={kind} className={s.shapeCard} data-reveal="" style={{"--i":i} as React.CSSProperties}><BuilderIllustration kind={kind}/><span>{label}</span></li>)}
        </ul>
      </div>
    </section>

    <section className={s.carrySection} aria-labelledby="builder-carry">
      <div className={`ds-wrap ${s.carryWrap}`}>
        <div>
          <Headline id="builder-carry" className="ds-h2" lines={[{text:"Draw it once."},{text:"It all carries over.",serif:true}]}/>
          <p className={s.carryText}>Drawing and editing the room shell never uses a credit. Enter measurements from your real room: default shapes, ceiling heights and openings are starting points, not verified building data.</p>
        </div>
        <ul className={s.carryList} data-stagger="">
          {CARRIES.map((item,i)=><li key={item} data-pop="" style={{"--i":i} as React.CSSProperties}><Check size={16} color="var(--ds-blue)"/>{item}</li>)}
        </ul>
      </div>
    </section>

    {children}

    <div className={s.ctaWrap}>
      <CtaBand tone="blue" lead="Start with a floor." tail="Build your world.">
        <button type="button" className="ds-btn ds-btn--white ds-btn--lg" onClick={()=>{setOrigin("cta");start();}} disabled={loading||busy}>{loading?"Checking your account…":busy?"Opening your builder…":!user?"Sign in to build in 3D":pro?"Start building in 3D":`Go Pro for $${PRO_PRICE_USD.toFixed(2)}`}</button>
        {error&&origin==="cta"&&<p role="alert" className={s.ctaError}>{error}</p>}
      </CtaBand>
    </div>
  </>;
}
