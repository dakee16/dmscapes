import type { Metadata } from "next";
import Link from "next/link";
import BuilderEntry from "@/components/builder/BuilderEntry";
import JsonLd from "@/components/site/JsonLd";
import PageShell from "@/components/ds/PageShell";
import { BUILDER_FAQS } from "@/content/builder-faq";
import { SITE_URL } from "@/lib/seo";
import s from "@/components/builder/Builder.module.css";
const title="3D Room Builder: Draw Your Dorm Room";
const description="Build your dorm room on a 3D grid. Draw walls, place a floor, add doors and windows, then furnish your custom room in 3D. Included with Dormscape Pro.";
export const metadata:Metadata={description,alternates:{canonical:"/plan/draw/3d"},openGraph:{title,description,url:"/plan/draw/3d",type:"website",images:[{url:"/og.png?v=folded-room",width:1200,height:630,alt:"Dormscape 3D Room Builder"}]},twitter:{card:"summary_large_image",title,description,images:["/og.png?v=folded-room"]}};
export default function Draw3DPage(){return <PageShell navOverlay navTone="dark" className={s.page}><BuilderEntry><section className={s.faq} aria-labelledby="builder-faq"><div className="ds-wrap"><p className={s.darkEyebrow}>Before you build</p><h2 id="builder-faq" className={s.faqTitle}>A few useful answers.</h2><dl className={s.faqGrid}>{BUILDER_FAQS.map(({q,a},i)=><div key={q} className={s.faqCard} data-reveal="" style={{"--i":i%2} as React.CSSProperties}><dt>{q}</dt><dd>{a}</dd></div>)}</dl><p className={s.fine}>Get the walkthrough: <Link href="/blog/build-a-dorm-room-in-3d">Build your first room in 3D</Link>. Compare <Link href="/pricing#pro">Pro features and pricing</Link>.</p></div></section></BuilderEntry><JsonLd data={{"@context":"https://schema.org","@type":"FAQPage",mainEntity:BUILDER_FAQS.map(({q,a})=>({"@type":"Question",name:q,acceptedAnswer:{"@type":"Answer",text:a}}))}}/><JsonLd data={{"@context":"https://schema.org","@type":"BreadcrumbList",itemListElement:[{ "@type":"ListItem",position:1,name:"Dormscape",item:SITE_URL},{"@type":"ListItem",position:2,name:"Draw your room",item:SITE_URL+"/plan/draw"},{"@type":"ListItem",position:3,name:"3D Room Builder",item:SITE_URL+"/plan/draw/3d"}]}}/></PageShell>;}
