"use client";

import BrandLoader from "@/components/site/BrandLoader";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { usePlannerStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { PLUS_PRICE_USD, PRO_PRICE_USD, isPaid } from "@/lib/plan";
import { track } from "@/lib/analytics";
import PageShell from "@/components/ds/PageShell";
import JsonLd from "@/components/site/JsonLd";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import { ArrowRight, ArrowUpRight } from "@/components/ds/Icons";
import Wordmark from "@/components/site/Wordmark";
import RoomDrawingPreview from "@/components/planner/RoomDrawingPreview";
import DrawnRoomsReuse from "@/components/planner/DrawnRoomsReuse";
import DrawSteps from "@/components/draw/DrawSteps";
import type { RoomDrawResult } from "@/components/planner/RoomDrawCanvas";
import css from "@/components/draw/DrawPage.module.css";

// react-konva can't render on the server, so load the editor client-side only.
const RoomDrawCanvas = dynamic(() => import("@/components/planner/RoomDrawCanvas"), {
  ssr: false,
  loading: () => <div className={css.loading}><BrandLoader label="Opening your drawing studio…"/></div>,
});

// What people ask before drawing a room; shown under the steps and repeated as FAQPage schema.
const FAQS = [
  {
    q: "How do I draw my dorm room floor plan?",
    a: "Measure your room's walls, then tap to place the corners on the grid and trace the walls. Tap a wall to add your door and windows, tap inside the room to add a closet, and choose a vibe. dormscape then creates a furniture layout and shopping list that fit your room.",
  },
  {
    q: "Does my room have to be a rectangle?",
    a: "No. You place each corner yourself, so L-shaped rooms and rooms with angled corners or bays work. Walls snap to 15 degree steps to keep the angles precise.",
  },
  {
    q: "Do I need to draw my room if my school is listed?",
    a: "No. If your school is on dormscape, pick your hall and room type and its published size loads without any drawing. Draw your room when your school isn't listed or your room differs from the published size.",
  },
  {
    q: "Is drawing free?",
    a: `Drawing is included with Plus ($${PLUS_PRICE_USD.toFixed(2)} once) and Pro ($${PRO_PRICE_USD.toFixed(2)} once). Planning a room from your school's published sizes is free.`,
  },
];

const OCC = [1, 2, 3, 4] as const;
const TYPE_FOR_OCC: Record<number, string> = { 1: "single", 2: "double", 3: "triple", 4: "quad" };

export default function DrawRoomPage() {
  const router = useRouter();
  const setRoom = usePlannerStore((s) => s.setRoom);
  const { profile, loading: authLoading } = useAuth();
  const { openUpgrade } = useUpgrade();
  const [started, setStarted] = useState(false);
  const [occupants, setOccupants] = useState(1);

  const paid = isPaid(profile);
  const drawLocked = !authLoading && !paid;

  function handleStart() {
    if (!paid) {
      track("draw_room_locked_clicked");
      openUpgrade("draw-room");
      return;
    }
    track("draw_room_started");
    setStarted(true);
  }

  function handleComplete(result: RoomDrawResult) {
    setRoom({
      type: TYPE_FOR_OCC[occupants] ?? "single",
      occupants,
      lengthFt: result.lengthFt,
      widthFt: result.widthFt,
      bedSize: "twin_xl",
      source: "drawn",
      outline: result.outline,
    });
    track("drawn_room_completed", {
      corners: result.outline.points.length,
      openings: result.outline.openings.length,
      closets: result.outline.closets.length,
      occupants,
    });
    usePlannerStore.getState().startManual();
    router.push("/plan/result");
  }

  // Drawing tool: a full-screen workbench (design-handoff designs/site/Draw).
  if (started) {
    return (
      <div className={`ds ${css.app}`}>
        <main id="page-content" tabIndex={-1} className={css.appMain}>
          <RoomDrawCanvas
            onComplete={handleComplete}
            chrome={{
              fill: true,
              lead: (
                <>
                  <Wordmark className={css.appMark} />
                  <span className={css.appRule} aria-hidden="true" />
                  <h1 className={css.appTitle}>Draw your exact room</h1>
                </>
              ),
              panel: (
                <>
                  <div className={css.people} role="group" aria-labelledby="draw-people-label">
                    <span id="draw-people-label" className={css.peopleLabel}>How many people?</span>
                    <div className={css.peopleSeg}>
                      {OCC.map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => setOccupants(n)}
                          aria-pressed={occupants === n}
                        >
                          {n}
                        </button>
                      ))}
                    </div>
                  </div>
                  <p className={css.plusNote}><span className="ds-tag">Plus</span>Drawing is included with Plus and Pro.</p>
                  <Link href="/plan/draw/3d" className={css.to3d}>Prefer 3D? Explore the 3D Room Builder<ArrowUpRight size={16} /></Link>
                </>
              ),
            }}
          />
        </main>
      </div>
    );
  }

  // Landing: the live drawing, what it does, and the button (Plus gate).
  return (
    <PageShell navOverlay>
      <PageHero
        bg="var(--ds-sky)"
        className={css.hero}
        eyebrow={<span className={css.eyebrow}>Step 1 · Draw your room<span className={`ds-tag ${css.tagNew}`}>New</span>{drawLocked && <span className={`ds-tag ${css.tagPlus}`}>Plus</span>}</span>}
        lines={[{ text: "Draw your", riso: true }, { text: "exact room.", serif: true }]}
        lede={<p>Draw your walls on the grid. Add your doors and windows, then choose a vibe. We’ll create a layout based on your room.</p>}
        visual={<RoomDrawingPreview />}
      >
        {/* Corners use the tap position, so the same editor works with touch. */}
        <button type="button" onClick={handleStart} className="ds-btn ds-btn--ink-yellow ds-btn--lg">
          {drawLocked ? "Unlock drawing (Plus)" : "Draw your room"}
          <ArrowRight />
        </button>
        <Link href="/plan/draw/3d" className={`ds-link ${css.heroLink}`}>Prefer 3D? Explore the 3D Room Builder</Link>
      </PageHero>

      <section className="ds-section" aria-labelledby="draw-how">
        <div className="ds-wrap">
          <Headline id="draw-how" className="ds-h2" lines={[{ text: "Measure. Trace." }, { text: "Make room.", serif: true }]} />
          <DrawSteps />
        </div>
      </section>

      <section className="ds-section" aria-labelledby="draw-faq">
        <div className={`ds-wrap ${css.faqWrap}`}>
          <h2 id="draw-faq" className={css.faqTitle}>Questions about drawing your room</h2>
          <dl className={css.faqList}>
            {FAQS.map((f) => (
              <div key={f.q}>
                <dt>{f.q}</dt>
                <dd>{f.a}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        }}
      />

      <section className={`ds-section ${css.more}`} aria-label="More ways to start">
        <div className={`ds-wrap ${css.moreWrap}`}>
          <DrawnRoomsReuse />
          <Link href="/plan/draw/3d" className={css.promo} data-reveal="">
            <span className={css.promoArt}>
              <Image src="/redesign/site-builder-under-construction.jpg" alt="A dorm room being built in the 3D Room Builder, its walls going up around a corner dragged to 16.4 feet" fill sizes="(min-width: 900px) 40vw, 100vw" quality={75} style={{ objectFit: "cover" }} />
            </span>
            <span className={css.promoCopy}>
              <span className={css.promoEyebrow}>New / Included with Pro</span>
              <strong className={css.promoTitle}>Start with a floor. <em>Build your world.</em></strong>
              <span className={css.promoText}>Place walls, floors, doors, and windows on a live 3D grid, then furnish your room in the 3D planner.</span>
              <b className={css.promoCta}>Explore the 3D Room Builder<ArrowUpRight size={18} /></b>
            </span>
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
