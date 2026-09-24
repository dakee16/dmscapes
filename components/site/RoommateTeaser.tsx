"use client";
import Link from "next/link";
import Modal from "@/components/site/Modal";
import {usePlannerStore} from "@/lib/store";
export default function RoommateTeaser({open,onClose}:{open:boolean;onClose:()=>void}){
 const room=usePlannerStore(s=>s.room),style=usePlannerStore(s=>s.style);
 if(!open)return null;
 return <Modal role="dialog" aria-modal="true" aria-labelledby="studio-intro-title" className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-5" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}>
 <div className="w-full max-w-lg border border-ink/15 bg-paper p-7 sm:p-10"><div className="flex justify-between gap-4"><p className="dm-eyebrow">Available now / Dormscape Pro</p><button onClick={onClose} aria-label="Close 3D introduction">✕</button></div><h2 id="studio-intro-title" className="dm-dialog-title mt-5">Your room. <em>Every angle.</em></h2><p className="my-5 leading-relaxed text-ink-soft">Arrange your furniture in live 3D. Try floor finishes and lighting, explore an inside view, and switch to the same layout in 2D.</p><p className="mb-6 text-sm text-ink-soft">Included with Pro. No extra generation credits to switch views. Shared links show a 2D plan to everyone; interactive 3D is for Pro members.</p>
 <Link className="dm-button w-full" href={room&&style?"/plan/result":"/plan?view=3d"} onClick={()=>{usePlannerStore.getState().setPlannerView("3d");onClose();}}>Plan with 3D ↗︎</Link><Link href="/plan/draw/3d" onClick={onClose} className="mt-5 block text-center text-sm text-cobalt underline">Or build your own walls and floor with Pro</Link><Link href="/blog/introducing-dormscape-3d-room-studio" onClick={onClose} className="mt-5 block text-center text-sm text-cobalt underline">See how the studio works</Link></div></Modal>;
}
