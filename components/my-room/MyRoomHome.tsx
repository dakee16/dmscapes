"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { isPro, planLabel, PRO_INITIAL_CREDITS, PRO_PRICE_USD } from "@/lib/plan";
import { workspaceRequest } from "@/lib/workspace-client";
import { WORKSPACE_MEMBER_LIMIT, type WorkspaceSummary } from "@/lib/workspace";
import type { AccountRoomSummary, AccountRoomsResponse } from "@/lib/api-types";
import { DEFAULT_PLANNING, shoppingProducts } from "@/lib/planning";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { formatRoomType } from "@/lib/format";
import Headline from "@/components/ds/Headline";
import { ArrowRight, Check } from "@/components/ds/Icons";
import BrandLoader from "@/components/site/BrandLoader";
import Modal, { ModalClose } from "@/components/site/Modal";
import PlanSketch from "./PlanSketch";
import SetupDialog, { type DesignOption } from "./SetupDialog";
import s from "./MyRoom.module.css";

const usd = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
function metaOf(collegeId: string | null, dormId: string | null, roomType: string, budget: number, total: number | null) {
  const school = collegeId ? getSchool(collegeId) : undefined, dorm = school?.dorms.find(d => d.id === dormId);
  const where = [dorm?.name.replace(/ Hall$/, "") ?? (school ? shortName(school) : null), formatRoomType(roomType)].filter(Boolean).join(" ");
  return [where, total !== null ? `${usd(total)} of ${usd(budget)}` : `${usd(budget)} budget`].filter(Boolean).join(" · ");
}

/** /my-room: the Pro home. Pro hosts with a shared room go straight to it; Pro
 * members without one open Setup; Free and Plus see the Pro gate. Invites skip
 * all of this at /rooms/join. */
export default function MyRoomHome() {
  const { user, profile, loading } = useAuth(), router = useRouter(), { openUpgrade } = useUpgrade();
  const [rooms, setRooms] = useState<WorkspaceSummary[]>([]), [saved, setSaved] = useState<AccountRoomSummary[]>([]);
  const [ready, setReady] = useState(false);
  const [gate, setGate] = useState(false), [setup, setSetup] = useState<{ pick?: string } | null>(null);
  const gated = useRef(false);
  const pro = isPro(profile);
  const load = useCallback(async () => {
    const [ws, designs] = await Promise.allSettled([workspaceRequest<{ rooms: WorkspaceSummary[] }>("/api/workspaces"), workspaceRequest<AccountRoomsResponse>("/api/account/rooms")]);
    if (ws.status === "fulfilled") setRooms(ws.value.rooms);
    if (designs.status === "fulfilled") setSaved(designs.value.rooms);
    setReady(true);
  }, []);
  useEffect(() => { if (loading) return; if (user) void load(); else { setRooms([]); setSaved([]); setReady(true); } }, [loading, user, load]);
  const hosted = rooms.find(r => r.role === "owner" && r.shared);
  const joined = rooms.find(r => r.role !== "owner" && r.shared);
  useEffect(() => { if (ready && pro && hosted) router.replace(`/rooms/${hosted.id}`); }, [ready, pro, hosted, router]);
  useEffect(() => { if (ready && user && profile && !pro && !gated.current) { gated.current = true; setGate(true); } }, [ready, user, profile, pro]);

  const options: DesignOption[] = useMemo(() => {
    const own = rooms.filter(r => r.role === "owner" && !r.shared);
    const fromWorkspace = new Set(own.map(r => r.source_room_id).filter(Boolean));
    return [
      ...own.map(r => { const sn = r.snapshot, d = sn.room_dimensions, e = d.editor; const total = e ? shoppingProducts(e.cartProducts, e.planning ?? DEFAULT_PLANNING).reduce((n, p) => n + p.price, 0) : null;
        return { key: `ws:${r.id}`, kind: "workspace" as const, id: r.id, name: r.name, meta: metaOf(sn.college_id, sn.dorm_id, d.room_type, sn.budget, total), lengthFt: d.length_ft, widthFt: d.width_ft, furniture: sn.furniture_positions, outline: d.outline ?? null }; }),
      ...saved.filter(r => !fromWorkspace.has(r.id)).map(r => { const total = r.editor ? shoppingProducts(r.editor.cartProducts, r.editor.planning ?? DEFAULT_PLANNING).reduce((n, p) => n + p.price, 0) : null;
        return { key: `saved:${r.id}`, kind: "saved" as const, id: r.id, name: r.name, meta: metaOf(r.college_id, r.dorm_id, r.room_type, r.budget, total), lengthFt: r.length_ft ?? 15, widthFt: r.width_ft ?? 12, furniture: r.furniture ?? [], outline: r.outline ?? null }; }),
    ];
  }, [rooms, saved]);

  function open(pick?: string) {
    if (!user) { router.push(`/login?next=${encodeURIComponent("/my-room")}`); return; }
    if (pro && hosted) { router.push(`/rooms/${hosted.id}`); return; }
    if (!pro) { setGate(true); return; }
    setSetup({ pick });
  }
  if (pro && (!ready || hosted)) return <div className={s.loading}><BrandLoader label="Opening your room…" /></div>;

  return <>
    <header className={s.hero}>
      <div className={`ds-wrap ${s.heroGrid}`}>
        <div className={s.heroCopy}>
          <p className="ds-eyebrow" data-reveal="load">My Room · Included with Pro</p>
          <Headline as="h1" load className={s.heroTitle} lines={[{ text: "Split the room,", riso: true }, { text: "not the fridge.", serif: true }]} />
          <p className={s.heroLede} data-reveal="load">A shared room for your people. Bring your roommate into the same plan, mark what&apos;s yours, theirs and shared, settle who brings what, and talk it through on a call while you move things around.</p>
          <div className={s.heroActions} data-reveal="load">
            <button type="button" className="ds-btn ds-btn--ink-yellow ds-btn--lg" onClick={() => open()} disabled={!!user && !ready}>Open My Room<ArrowRight /></button>
            <a href="#how" className="ds-btn ds-btn--white ds-btn--lg">See how it works</a>
          </div>
          <ul className={s.chips} data-stagger="">
            <li data-pop="">Up to {WORKSPACE_MEMBER_LIMIT} people</li><li data-pop="">Friends join free</li><li data-pop="">Invites use no credits</li>
          </ul>
          {joined && <p className={s.joined}>You&apos;re already in <Link href={`/rooms/${joined.id}`}>{joined.name}</Link>. Guests plan there for free.</p>}
        </div>
        <div className={s.heroArt}>
          <Image src="/redesign/myroom-split-room.jpg" alt="A dorm double split down the middle by a strip of blue painter's tape. One bed on the left, one on the right, and a shared mini fridge and round yellow rug in the middle, each tagged with its owner." fill preload quality={80} sizes="(min-width: 1024px) 52vw, 100vw" />
          <div className={s.callChip} aria-hidden="true"><span className={s.callFaces}><i>J</i><i>M</i></span>Room call<span className={s.callBars}><b /><b /><b /><b /></span></div>
          <div className={s.noteCard} aria-hidden="true"><i>M</i><span><span><strong>Maya</strong> is bringing the <strong>mini fridge</strong> from home.</span><small>Shared · $0 to buy</small></span></div>
        </div>
      </div>
    </header>

    <section id="how" className={s.how} aria-labelledby="how-title">
      <div className="ds-wrap"><h2 id="how-title" className={s.h2}>Four steps to a room you <em>both</em> agree on.</h2></div>
      <div className={s.howTape} aria-hidden="true" />
      <ol className={`ds-wrap ${s.steps}`} data-stagger="">
        {[["Pick a design", "Any saved design opens as your shared room, furniture and list included."],
          ["Draw the line", "Split the floor down the middle or by bed. Your half, their half, the middle."],
          ["Invite your people", `Up to ${WORKSPACE_MEMBER_LIMIT - 1} more. Roommates can edit, parents can comment. Joining is free.`],
          ["Plan it out loud", "Hop on the room call, move things around, and settle who brings what."]].map(([t, d], i) =>
          <li key={t} data-reveal=""><span className={s.stepNum} data-last={i === 3}>0{i + 1}</span><strong>{t}</strong><p>{d}</p></li>)}
      </ol>
    </section>

    <section className={s.features} aria-labelledby="features-title">
      <div className="ds-wrap">
        <h2 id="features-title" className={s.h2Lg}>Everything a shared room <em>needs.</em></h2>
        <div className={s.featureGrid} data-stagger="">
          <article data-reveal=""><span className={s.artSplit} aria-hidden="true"><i /><i /><b /><b /><u /></span><div><h3>Mine, yours, shared</h3><p>Everything on the plan carries an owner, in their color, or stays shared between you.</p></div></article>
          <article data-reveal=""><span className={s.artList} aria-hidden="true"><span><i data-c="m" />Fridge<em>Home</em></span><span><i data-c="j" />Microwave<em>$79</em></span><span><i data-c="s" />Rug<em>Shared</em></span></span><div><h3>Who brings what</h3><p>Claim it, bring it from home, or keep it shared. Two fridges on the list? You&apos;ll hear about it.</p></div></article>
          <article data-reveal=""><span className={s.artPin} aria-hidden="true"><i /><b>M · 3</b></span><div><h3>Comments on the plan</h3><p>Pin a question to the rug, reply, and resolve it when you agree.</p></div></article>
          <article data-reveal="" className={s.featureInk}><span className={s.artCall} aria-hidden="true"><i>J</i><i>M</i></span><div><h3>A voice channel in the room</h3><p>Join the room call with one tap. Talk while you drag furniture, no meeting links.</p></div></article>
          <article data-reveal=""><span className={s.artVersions} aria-hidden="true"><span>Before move-in</span><span>Autosave</span><span>Starting point</span></span><div><h3>Room versions</h3><p>Saved as you go, every few minutes, plus versions you name. Bring back any of them.</p></div></article>
          <article data-reveal=""><span className={s.artSeats} aria-hidden="true"><i data-c="j">Host</i><i data-c="m">Edit</i><i data-c="a">Comment</i><i data-c="n">+</i></span><div><h3>Edit or comment access</h3><p>Roommates move things. Parents weigh in without moving the bed.</p></div></article>
        </div>
      </div>
    </section>

    <section className={s.start} aria-labelledby="start-title">
      <div className={`ds-wrap ${s.startGrid}`}>
        <div>
          <h2 id="start-title" className={s.h2}>Pick the design you&apos;ll <em>share.</em></h2>
          <p>Pro hosts one active shared room at a time. Your saved designs stay as they are.</p>
          <p className={s.mono}>Invitations use no credits.<br />Guests never spend yours.</p>
        </div>
        <div className={s.startCards}>
          {!user ? <Link href={`/login?next=${encodeURIComponent("/my-room")}`} className={s.startCard} data-empty="true"><strong>Sign in to see your designs</strong><span>Log in <ArrowRight size={12} /></span></Link>
            : !ready ? <p className={s.startNote}>Opening your designs…</p>
            : options.length ? options.slice(0, 3).map(o => <button key={o.key} type="button" className={s.startCard} onClick={() => open(o.key)}>
              <span className={s.startPlan}><PlanSketch lengthFt={o.lengthFt} widthFt={o.widthFt} furniture={o.furniture} outline={o.outline} maxWidth={190} maxHeight={84} /></span>
              <strong>{o.name}</strong><span>Open as My Room <ArrowRight size={12} /></span>
            </button>)
            : <Link href="/plan" className={s.startCard} data-empty="true"><strong>Save a design first</strong><span>Plan your room <ArrowRight size={12} /></span></Link>}
        </div>
      </div>
    </section>

    {gate && <Modal className={s.gateLayer} aria-labelledby="gate-title" onKeyDown={e => { if (e.key === "Escape") setGate(false); }} onClick={() => setGate(false)}>
      <div className={s.gate} onClick={e => e.stopPropagation()}>
        <div className={s.gateArt}>
          <Image src="/redesign/myroom-split-room.jpg" alt="" fill quality={75} sizes="(min-width: 900px) 460px, 100vw" />
          <span className={s.gateTag}>My Room · Pro</span>
        </div>
        <div className={s.gateBody}>
          <ModalClose onClick={() => setGate(false)} className={s.gateClose} />
          <p className={s.gateEyebrow}>You&apos;re on {planLabel(profile)}</p>
          <h2 id="gate-title"><span>My Room is</span> <em>part of Pro.</em></h2>
          <p className={s.gateLede}>A shared room for your people. Host one shared room with up to {WORKSPACE_MEMBER_LIMIT} people, and plan it together.</p>
          <ul className={s.gateList}>
            {["Friends join free with editing or comment access", "Mark what's yours, theirs and shared, and who brings what", "A shared shopping list, comments and room versions", "A voice channel right in the room"].map(t => <li key={t}><Check size={18} color="#2449FF" />{t}</li>)}
          </ul>
          <p className={s.gateMore}>Pro also unlocks the 3D Room Builder, the live 3D Room Studio, {PRO_INITIAL_CREDITS} plan credits and Create your own vibe.</p>
          <div className={s.gateBuy}>
            <button type="button" className={s.gateCta} onClick={() => { setGate(false); openUpgrade("workspace"); }}>Go Pro · ${PRO_PRICE_USD.toFixed(2)} once</button>
            <span>One payment.<br />No subscription.</span>
          </div>
          <p className={s.gateInvite}>{joined ? <>You&apos;re already in a shared room. <Link href={`/rooms/${joined.id}`}>Open {joined.name}</Link></> : <>Got an invite from a roommate? Open the link in that email to <strong>join their room free.</strong></>}</p>
        </div>
      </div>
    </Modal>}

    {setup && user && <SetupDialog userId={user.id} options={options} initial={setup.pick} onClose={() => setSetup(null)} />}
  </>;
}
