"use client";
import ProductImage from "@/components/products/ProductImage";
import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { productsFor } from "@/lib/catalog";
import { useExperienceMotion } from "./MotionProvider";
import s from "./RoomJourney.module.css";
export default function WorkspaceStory() {
  const { paused }=useExperienceMotion();
  const [claimed,setClaimed]=useState<string[]>([]);
  const products=productsFor("cozy","mid","twin_xl").slice(0,3);
  return <section id="together" className={s.together} data-paused={paused} aria-labelledby="together-title"><div className={s.heading}><div><p className={s.eyebrow}>03 / Get ready together</p><h2 id="together-title">Same room.<br/><em>On the same page.</em></h2></div><p>The layout you love. The things you need. The people you&apos;re moving in with. Keep it all in My rooms.</p></div>
    <motion.div className={s.demo} initial={paused?false:{opacity:0,y:50,rotateX:7}} whileInView={{opacity:1,y:0,rotateX:0}} viewport={{once:true,amount:.15}} transition={{duration:.7}}>
      <header className={s.demoHeader}><strong>Our first room</strong><span className={s.eyebrow}>Interactive example</span><div className={s.people} aria-hidden="true"><span>J</span><span>A</span></div></header>
      <div className={s.demoBody}><div className={s.plan}><svg viewBox="0 0 420 330" fill="none" aria-label="Example shared room layout" role="img"><rect x="42" y="22" width="334" height="264" fill="#fffdf7" stroke="#17172b" strokeWidth="6"/><path d="M167 22h85" stroke="#829cf9" strokeWidth="7"/><path d="M80 286h51" stroke="#eaece8" strokeWidth="8"/><path d="M80 286v-51a51 51 0 0 1 51 51" stroke="#8a91a4" strokeWidth="2"/><rect x="55" y="36" width="92" height="148" rx="4" fill="#d4b695"/><rect x="61" y="42" width="80" height="135" rx="3" fill="#ccd6ff"/><rect x="70" y="49" width="62" height="25" rx="5" fill="#fffdf7"/><rect x="271" y="36" width="92" height="148" rx="4" fill="#d4b695"/><rect x="277" y="42" width="80" height="135" rx="3" fill="#ffe787"/><rect x="286" y="49" width="62" height="25" rx="5" fill="#fffdf7"/><path d="M162 42h90v42h-90zM257 227h102v43H257z" fill="#d6c2a7" stroke="#b29e85" strokeWidth="2"/><path d="M174 49h46v24h-46zM288 234h46v24h-46z" fill="#17172b"/><rect x="158" y="132" width="98" height="122" rx="4" fill="#d4dfd2" stroke="#b0c0af" strokeWidth="2"/><path d="M166 142h82v102h-82z" stroke="#edf1e9" strokeWidth="3"/><circle cx="209" cy="105" r="14" fill="#8799c5"/><circle cx="310" cy="205" r="14" fill="#ddbd6b"/></svg><div className={s.cursor} aria-hidden="true"><svg viewBox="0 0 24 28"><path d="m2 1 20 14-10 1-5 10Z" fill="#304bff" stroke="white" strokeWidth="2"/></svg><span>Make it yours</span></div><div className={s.bubble}><strong>Jamie · Layout idea</strong>Desks by the window? I&apos;m in.</div></div>
        <aside className={s.shop}><header><strong>Shopping list</strong><span className={s.eyebrow}>Together</span></header><p>Try claiming an item. One list keeps everyone in the loop.</p>{products.map(p=><div className={s.demoProduct} key={p.id}><ProductImage src={p.image_url}/><div><strong>{p.name}</strong><small>${p.price.toFixed(2)}</small><button aria-pressed={claimed.includes(p.id)} onClick={()=>setClaimed(old=>old.includes(p.id)?old.filter(x=>x!==p.id):[...old,p.id])}>{claimed.includes(p.id)?"✓ I'll bring it":"I'll bring this"}</button></div></div>)}<p style={{marginTop:16}}>Example picks. Check current prices with the retailer.</p></aside>
      </div><footer className={s.demoFooter}><span>One Pro host. Your friends join free.</span><Link href="/rooms">Explore My rooms ↗</Link></footer>
    </motion.div>
    <div className={s.benefits}><div><span>01 / KEEP YOUR IDEAS</span><h3>A place for every possibility.</h3><p>Try a different layout. Keep the one you love. Your shopping picks travel with your room.</p></div><div><span>02 / SHOP WITH A PLAN</span><h3>Less guessing. Better buying.</h3><p>See products beside your layout, swap a favorite, and keep your list within budget.</p></div><div id="room-in-3d-end"><span id="room-in-3d">03 / GO FURTHER WITH PRO</span><h3>Step inside. Bring your people.</h3><p>Explore in live 3D and host one shared room with up to eight people. <Link href="/pricing#pro">Explore Pro ↗</Link></p></div></div>
  </section>;
}
