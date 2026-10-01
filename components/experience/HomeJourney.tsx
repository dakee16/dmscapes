"use client";

import { useState } from "react";
import Link from "next/link";
import { productsFor } from "@/lib/catalog";
import type { StyleId } from "@/lib/types";
import StyleScene from "@/components/site/StyleScene";
import ProductImage from "@/components/products/ProductImage";
import Reveal from "@/components/site/Reveal";
import PlanCta from "@/components/site/PlanCta";
import s from "./HomeJourney.module.css";

const styles: { id: StyleId; name: string; color: string }[] = [
  { id: "minimalist", name: "Minimalist", color: "#c4cbc2" },
  { id: "cozy", name: "Cozy", color: "#cba67b" },
  { id: "preppy", name: "Preppy", color: "#98b5dc" },
  { id: "academia", name: "Academia", color: "#73543f" },
  { id: "y2k", name: "Y2K", color: "#b693e7" },
  { id: "gamer", name: "Gamer", color: "#7b71c9" },
  { id: "team_spirit", name: "Team spirit", color: "#b95842" },
  { id: "retro", name: "Retro", color: "#c88849" },
  { id: "pastel", name: "Pastel", color: "#e3beca" },
];

export default function HomeJourney({ schoolCount }: { schoolCount: number }) {
  const [style, setStyle] = useState<StyleId>("cozy");
  const products = productsFor(style, "mid", "twin_xl").slice(0, 3);
  return <div id="how-it-works" className={s.journey}>
    <Reveal className={s.intro}><p className={s.eyebrow}>From floor plan to move-in</p><h2>One room.<br/><em>Three simple steps.</em></h2><nav aria-label="How Dormscape works"><a href="#find-your-room">01 / Find your room</a><a href="#vibes">02 / Make it yours</a><a href="#shop-your-room">03 / Shop the plan</a></nav></Reveal>
    <section id="find-your-room" className={s.find} aria-labelledby="find-title">
      <Reveal><p className={s.eyebrow}>01 / Start with your space</p><h3 id="find-title">Your actual room.<br/><em>A better starting point.</em></h3><p>Pick your school, building, and room type. Or draw your own room with the dimensions you have.</p><div className={s.links}><PlanCta className="dm-text-link"/><Link href="/plan/draw">Draw my room ↗</Link></div></Reveal>
      <Reveal className={s.schoolCard}><div className={s.cardTop}><span>Your room, found.</span><span>{schoolCount} schools</span></div><div className={s.schoolRow}><small>SCHOOL</small><strong>University of Michigan</strong></div><div className={s.schoolRow}><small>BUILDING</small><strong>Mosher-Jordan Hall</strong></div><div className={s.schoolBottom}><span>Room dimensions<br/><small>Check estimates with your housing office.</small></span><b>15′6″ × 12′0″</b></div><Link id="schools" href="/colleges">Explore the school directory <span aria-hidden="true">↗</span></Link></Reveal>
    </section>
    <section id="vibes" className={s.style} aria-labelledby="style-title">
      <Reveal className={s.styleVisual}><div className={s.cardTop}><span>Style study / {styles.find(v => v.id === style)?.name}</span><span aria-hidden="true">✳</span></div><div key={style} className={s.scene}><StyleScene id={style}/></div><p>Same room. A different feeling.</p></Reveal>
      <Reveal className={s.styleCopy}><p className={s.eyebrow}>02 / Make it feel like you</p><h3 id="style-title">Your taste.<br/><em>Your kind of room.</em></h3><p>Choose a style and set your budget. Your bedding, lighting, storage, and decor come together around both.</p><div className={s.swatches} role="group" aria-label="Preview a room style">{styles.map(v => <button key={v.id} aria-pressed={style === v.id} onClick={() => setStyle(v.id)}><i style={{ background: v.color }}/>{v.name}</button>)}</div><p className={s.micro}>Three styles free. All nine with Plus or Pro.</p><Link id="create-your-own" className={s.custom} href="/plan"><span><small>CREATE YOUR OWN VIBE · PRO</small><strong>Have something else in mind?</strong><span>Describe it. We&apos;ll find the pieces.</span></span><b aria-hidden="true">↗</b></Link></Reveal>
    </section>
    <section id="shop-your-room" className={s.shopping} aria-labelledby="shopping-title">
      <Reveal className={s.shopHeading}><div><p className={s.eyebrow}>03 / The plan meets the shopping list</p><h3 id="shopping-title">See where it goes.<br/><em>Know where to get it.</em></h3></div><p>Arrange your room with real products beside it. Swap a pick, check your budget, and open the retailer link when you&apos;re ready.</p></Reveal>
      <Reveal className={s.preview}><div className={s.previewRoom}><div className={s.cardTop}><span>Your layout</span><span>2D plan</span></div><svg viewBox="0 0 440 330" role="img" aria-label="Example floor plan with a bed, desk, dresser and rug"><path d="M45 280V30h350v250H100" fill="#fffdf7" stroke="#17172b" strokeWidth="5"/><path d="M45 280v-55a55 55 0 0 1 55 55" fill="none" stroke="#8791ad" strokeWidth="2"/><path d="M205 30h100" stroke="#9dafff" strokeWidth="7"/><rect x="59" y="43" width="99" height="159" rx="4" fill="#bca282"/><rect x="64" y="48" width="89" height="147" rx="4" fill={styles.find(v => v.id === style)?.color}/><rect x="74" y="56" width="69" height="29" rx="5" fill="#fffdf7"/><rect x="216" y="44" width="160" height="52" rx="3" fill="#d7bf9b"/><rect x="264" y="51" width="63" height="30" rx="2" fill="#17172b"/><circle cx="294" cy="123" r="19" fill="#c2cbbc"/><rect x="190" y="159" width="109" height="103" fill="#f1e3c9" stroke="#d7c4a2" strokeWidth="3"/><path d="M200 169h89v83h-89z" fill="none" stroke="#caba98"/><rect x="334" y="194" width="47" height="70" rx="3" fill="#bd9f76"/><path d="M338 211h39m-39 22h39m-39 22h39" stroke="#8b7458"/><text x="53" y="314" fill="#686a80" fontSize="12" fontFamily="monospace">ILLUSTRATIVE LAYOUT / PRODUCTS VARY</text></svg><span className={s.connected}>↗ Your room and your picks, together</span></div><aside className={s.productPanel}><div className={s.cardTop}><strong>Your shopping list</strong><span>{styles.find(v => v.id === style)?.name}</span></div>{products.map(p => <a className={s.product} key={p.id} href={p.affiliate_url} target="_blank" rel="noopener noreferrer sponsored"><ProductImage src={p.image_url}/><span><strong>{p.name}</strong><small>View at retailer ↗</small></span><b>${p.price.toFixed(2)}</b></a>)}<div className={s.listEnd}><span>These {products.length} example picks</span><strong>${products.reduce((sum, p) => sum + p.price, 0).toFixed(2)}</strong></div><small className={s.micro}>Prices can change at the retailer. We may earn from qualifying purchases.</small><PlanCta className={s.shopCta}/></aside></Reveal>
    </section>
  </div>;
}
