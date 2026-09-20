"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValueEvent, useScroll, useTransform } from "framer-motion";
import { useExperienceMotion } from "./MotionProvider";
import s from "./StudioShowcase.module.css";

type Showcase = { progress:(value:number)=>void; destroy:()=>void };
const chapters = ["The plan", "Make it yours", "Be there"];

export default function StudioShowcase() {
  const section = useRef<HTMLElement>(null), stage = useRef<HTMLDivElement>(null);
  const renderer = useRef<Showcase|null>(null);
  const { paused } = useExperienceMotion();
  const { scrollYProgress } = useScroll({ target:section, offset:["start 72px", "end end"] });
  const [choice,setChoice] = useState<number|null>(null), [chapter,setChapter] = useState(0);
  useEffect(()=>{
    const followHash=()=>{if(window.location.hash==="#room-in-3d-end")setChoice(2);};
    const followLink=(event:MouseEvent)=>{
      const link=(event.target as Element).closest?.("a");
      if(link?.pathname==="/"&&link.hash==="#room-in-3d-end")setChoice(2);
    };
    followHash();window.addEventListener("hashchange",followHash);document.addEventListener("click",followLink);
    return()=>{window.removeEventListener("hashchange",followHash);document.removeEventListener("click",followLink);};
  },[]);
  const latest = useRef({paused,choice,progress:0});
  latest.current = {paused,choice,progress:scrollYProgress.get()};
  const watermarkY = useTransform(scrollYProgress,[0,1],[40,-70]);
  useMotionValueEvent(scrollYProgress,"change",value=>{
    latest.current.progress=value;
    if (latest.current.choice===null) {
      renderer.current?.progress(latest.current.paused?1:value);
      setChapter(Math.min(2,Math.floor(value*3)));
    }
  });
  useEffect(()=>{
    renderer.current?.progress(choice===null?(paused?1:scrollYProgress.get()):choice/2);
  },[paused,choice,scrollYProgress]);
  useEffect(()=>{
    const node=stage.current;if(!node)return;
    let disposed=false;
    const observer=new IntersectionObserver(async([entry])=>{
      if(!entry.isIntersecting)return;observer.disconnect();
      try {
        const path="/experience/studio-showcase.js";
        const module=await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ path) as {createShowcase:(node:HTMLElement)=>Showcase};
        if(disposed)return;
        renderer.current=module.createShowcase(node);
        const current=latest.current;
        renderer.current.progress(current.choice===null?(current.paused?1:current.progress):current.choice/2);
        node.dataset.ready="true";
      } catch { node.dataset.ready="false"; }
    },{rootMargin:"250px"});
    observer.observe(node);
    return()=>{disposed=true;observer.disconnect();renderer.current?.destroy();renderer.current=null;};
  },[]);
  const active=choice??(paused?2:chapter);
  return <section ref={section} id="room-in-3d" className={s.showcase} data-paused={paused} aria-labelledby="showcase-title">
    <span id="room-in-3d-end" className={s.endFrame} aria-hidden="true"/>
    <div className={s.sticky}>
      <div className={s.grid} aria-hidden="true"/>
      <motion.span className={s.watermark} style={{y:paused?0:watermarkY}} aria-hidden="true">3D</motion.span>
      <div className={s.topline}><span><i/> THE ROOM STUDIO / LIVE NOW</span><span className={s.pro}>INCLUDED WITH PRO ↗︎</span></div>
      <div className={s.content}>
        <div className={s.copy}>
          <p className={s.kicker}>A whole new perspective.</p>
          <h2 id="showcase-title">Your room.<br/><em>Now in 3D.</em></h2>
          <p className={s.description}>Move the desk. Find your light. Step inside. Meet the room you can&apos;t wait to move into.</p>
          <Link href="/plan?view=3d" className={s.cta}>Plan with 3D <span aria-hidden="true">↗︎</span></Link>
          <div className={s.links}><Link href="/pricing#pro">Explore Pro</Link><Link href="/blog/introducing-dormscape-3d-room-studio">Take the tour ↗︎</Link></div>
        </div>
        <div className={s.visual}>
          <div className={s.orbit} aria-hidden="true"/><div className={s.orbitTwo} aria-hidden="true"/>
          <div ref={stage} className={s.stage} role="img" aria-label="A blueprint rises into a furnished 3D dorm room with a bed, desk, rug, window, and warm lighting">
            <svg className={s.fallback} viewBox="0 0 600 500" aria-hidden="true"><g fill="none" stroke="#cbd7ff" strokeWidth="2"><path d="m88 285 220-120 210 124-221 127Z" fill="#a0b2ed"/><path d="M88 285V159L308 40v125M308 40l210 125v124" fill="#e1e7ff"/><path d="m308 40 210 125v124L308 165Z" fill="#b4c3fb"/><path d="m124 266 72-40 124 72-74 42Z" fill="#fff2d8"/><path d="m124 266 122 74v20l-122-74Zm122 74 74-42v20l-74 42Z" fill="#c5a57e"/><path d="m165 255 31-17 40 23-31 17Z" fill="#314fff"/><path d="m280 322 68-37 89 50-69 40Z" fill="#314fff"/><path d="m342 220 53-28 89 51-52 28Z" fill="#ffdc60"/><path d="M347 223v45m130-21v44M364 100l81 48v67l-81-48Z"/></g></svg>
          </div>
          <span className={s.coord} aria-hidden="true">12′ × 10′ / ENDLESS POSSIBILITIES</span>
          <div className={s.sceneCaption}><span className={s.sceneNumber}>0{active+1}</span><span>{["Start with your floor plan.","Every piece, in its place.","Your move-in, previewed."][active]}</span><span aria-hidden="true">↗︎</span></div>
        </div>
      </div>
      <div className={s.bottom}>
        <div className={s.chapters} role="group" aria-label="Preview the 3D studio reveal">{chapters.map((label,i)=><button type="button" key={label} aria-pressed={active===i} onClick={()=>setChoice(i)}><span>0{i+1}</span>{label}<i/></button>)}</div>
        <p>{choice===null?"Scroll to bring it to life ↓":<button type="button" onClick={()=>setChoice(null)}>Follow the scroll ↓</button>}<small>One layout. Both views. No extra plan credits.</small></p>
      </div>
    </div>
  </section>;
}
