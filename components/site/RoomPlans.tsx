import Link from "next/link";
import { PLUS_PRICE_USD, PRO_PRICE_USD, PLUS_INITIAL_CREDITS, PRO_INITIAL_CREDITS, RECHARGE_CREDITS, RECHARGE_PRICE_USD } from "@/lib/plan";
import Reveal from "./Reveal";
import s from "./RoomPlans.module.css";

export default function RoomPlans() {
  const plans = [
    {name:"Free",tag:"Try your first idea",price:"0",credits:"1",note:"generated design",perks:["3 curated styles","2D layout + shoppable picks","Personal rooms and free saving"],href:"/plan",cta:"Start planning",index:"01"},
    {name:"Plus",tag:"Make it your own",price:PLUS_PRICE_USD.toFixed(2),credits:String(PLUS_INITIAL_CREDITS),note:"generated designs",perks:["All 9 styles + 2D room drawing","Your own Amazon product picks","PDF, PNG + design comparison"],href:"/pricing",cta:"Explore Plus",index:"02"},
    {name:"Pro",tag:"The whole room experience",price:PRO_PRICE_USD.toFixed(2),credits:String(PRO_INITIAL_CREDITS),note:"generated designs",perks:["Everything in Plus","Live 3D planning + 3D Room Builder","Create your own vibe","1 shared room for 4 people total"],href:"/pricing#pro",cta:"Make room with Pro",index:"03"},
  ];
  return <section id="pricing" className={s.section} aria-labelledby="plans-title">
    <Reveal className={s.heading}><div><p className={s.eyebrow}>Your room. Your pace.</p><h2 id="plans-title">Big plans.<br/><em>Small price.</em></h2></div><div className={s.purchaseNote}><span aria-hidden="true">↗</span><strong>Buy once.<br/>Make it yours.</strong><p>No subscription. Start free and upgrade when you're ready.</p></div></Reveal>
    <div className={s.grid}>{plans.map(plan=><Reveal className={s.cardWrap} key={plan.name}><article className={s.card} data-tier={plan.name.toLowerCase()}>
      <div className={s.cardMeta}><span>{plan.index} / {plan.tag}</span>{plan.name==="Pro"&&<b>ALL ACCESS</b>}</div>
      <div className={s.identity}><h3>{plan.name}</h3><svg viewBox="0 0 100 85" aria-hidden="true"><path d="M10 59V26L50 5l40 21v33L50 80Z" fill="none" stroke="currentColor" strokeWidth="1.5"/><path d="m10 26 40 22 40-22M50 48v32M50 5v43" fill="none" stroke="currentColor" strokeWidth="1.5"/><path className={s.roomFloor} d="m10 59 40-22 40 22-40 21Z" fill="currentColor" opacity=".15"/></svg></div>
      <div className={s.price}><strong>${plan.price}</strong><span>{plan.name==="Free"?"to get started":"one-time payment"}</span></div>
      <div className={s.credits}><b>{plan.credits}</b><span>{plan.note}<small>Saving and manual edits use no credits.</small></span></div>
      <ul>{plan.perks.map(perk=><li key={perk}><span aria-hidden="true">✓</span>{perk}</li>)}</ul>
      <Link className={s.cta} href={plan.href}>{plan.cta}<span aria-hidden="true">↗</span></Link>
    </article></Reveal>)}</div>
    <div className={s.after}><p>Need more designs? Plus recharge: {RECHARGE_CREDITS} credits for ${RECHARGE_PRICE_USD.toFixed(2)}. Every tier can also buy individual credits.</p><Link href="/pricing">Compare every feature <span aria-hidden="true">↗</span></Link></div>
  </section>;
}
