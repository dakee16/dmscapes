"use client";

import { useRef, useState } from "react";
import { EXAMPLE_ITEMS, HERO_ROOM, SHOWCASE_BUDGET, examplePlan, feetInches, spokenFeet } from "@/lib/home-data";
import { isWide, scrub, useScene } from "./flow";
import H2 from "./H2";
import css from "./Home.module.css";

const QUESTIONS = [
  { q: "“How big is my room?”", a: "Real dimensions for your exact hall" },
  { q: "“Will it fit?”", a: "Every piece placed on your floor plan" },
  { q: "“Do I need all this?”", a: "A list for your room, not every room" },
];
const EXAMPLE = examplePlan(SHOWCASE_BUDGET);

/**
 * 02 · Why plan. A fit check of the real Geary Hall double answers the three
 * questions in turn (an Apple Feature Block stepper): the exact size replaces
 * "approx.", the furniture and rug land and fit, and a generic list becomes
 * the example plan. On wide screens the section holds while scroll steps
 * through them; a click works too. Still, it shows the last step.
 */
export default function ProblemSection() {
  const section = useRef<HTMLElement>(null);
  const card = useRef<HTMLElement>(null);
  const pinned = useRef(false);
  const [step, setStep] = useState(2);

  useScene((A) => {
    const pr = section.current;
    if (!pr) return;
    const wide = isWide();
    pinned.current = wide;
    setStep(0);
    // The dimension lines draw in as the card arrives.
    const offCard = card.current ? scrub(A, card.current, "--p", { target: card.current, enter: "end start", leave: "58% start" }) : () => {};
    const obs = A.onScroll({
      target: pr,
      enter: wide ? "start start" : "55% start",
      leave: wide ? "end end" : "45% end",
      onUpdate: (o) => {
        const x = o.progress * 3;
        const i = Math.min(2, Math.floor(x));
        pr.style.setProperty("--qp", Math.min(1, x - i).toFixed(3));
        setStep(i);
      },
    });
    return () => {
      offCard();
      obs.revert();
      pr.style.removeProperty("--qp");
      pinned.current = false;
      setStep(2);
    };
  });

  // While the section holds, each question lives at its own stretch of the scroll.
  const pick = (k: number) => {
    const pr = section.current;
    if (!pinned.current || !pr) return setStep(k);
    const range = pr.offsetHeight - window.innerHeight;
    window.scrollTo({ top: pr.getBoundingClientRect().top + window.scrollY + range * ((k + 0.5) / 3), behavior: "smooth" });
  };

  return (
    <section ref={section} id="why" className={css.problem} data-bg="#f5e9d8" aria-labelledby="problem-title">
      <div className={`ds-wrap ${css.prGrid}`}>
        <div className={css.prCopy}>
          <p className="ds-eyebrow" data-rv="">
            Why dorm shopping goes wrong
          </p>
          <H2 id="problem-title" s="Winging it gets returned." f="Planning fits." />
          <p className={`ds-lede ${css.lede}`} data-rv="">
            Housing pages list room sizes as approximate, if they list them at all. Generic packing lists run to dozens
            of items. So families buy blind, and{" "}
            <mark className={css.marker} data-rv="marker" data-anim="">
              the futon goes back.
            </mark>
          </p>
          <ol className={css.qsteps} data-rv="">
            {QUESTIONS.map((r, i) => (
              <li key={r.q} data-on={step === i || undefined}>
                <button type="button" className={css.qBtn} aria-pressed={step === i} onClick={() => pick(i)}>
                  <span className={css.qn} aria-hidden="true">0{i + 1}</span>
                  <span className={css.qq}>{r.q}</span>
                  <span className={css.qa}>{r.a}</span>
                </button>
                <span className={css.qBar} aria-hidden="true">
                  <i />
                </span>
              </li>
            ))}
          </ol>
        </div>
        {HERO_ROOM && <FitCheck cardRef={card} step={step} />}
      </div>
    </section>
  );
}

function FitCheck({ cardRef, step }: { cardRef: React.RefObject<HTMLElement | null>; step: number }) {
  const room = HERO_ROOM!;
  const len = feetInches(room.lengthFt), wid = feetInches(room.widthFt);
  return (
    <figure
      ref={cardRef}
      className={css.fc}
      data-k={step}
      data-rv="fc"
      aria-label={`A fit check of the ${room.school} ${room.hall} double, ${spokenFeet(room.lengthFt)} by ${spokenFeet(room.widthFt)}: the exact room size replaces an approximate one, the furniture and a 6 by 4 foot rug are placed and fit, and a generic list of dozens of items becomes a ${EXAMPLE.pieces}-piece example plan.`}
    >
      <div className={css.fcTop}>
        <span className={css.fcId}>
          <strong>
            {room.school} · {room.hall}
          </strong>
          <span>
            DOUBLE · <span className={css.ft}>{len} × {wid}</span>
          </span>
        </span>
        <span className={css.fcStamp} aria-hidden="true">
          <b className={css.sw}>WINGING IT</b>
          <b className={css.sp}>PLANNED</b>
        </span>
      </div>
      <div className={css.fcStage} aria-hidden="true">
        <span className={`${css.dim} ${css.dw}`}>
          <i />
          <em>{len}</em>
        </span>
        <span className={`${css.dim} ${css.dh}`}>
          <i />
          <em>{wid}</em>
        </span>
        <div className={css.fcRoom} style={{ aspectRatio: `${room.lengthFt} / ${room.widthFt}` }}>
          <span className={css.ghost}>
            <em>“Approx.” on the housing page</em>
          </span>
          <span className={css.win} />
          <span className={css.door} />
          <span className={css.swing} />
          <span className={`${css.fu} ${css.bed} ${css.bedA}`} />
          <span className={`${css.fu} ${css.bed} ${css.bedB}`} />
          <span className={`${css.fu} ${css.desk} ${css.deskA}`} />
          <span className={`${css.fu} ${css.desk} ${css.deskB}`} />
          <span className={`${css.fu} ${css.rug}`}>
            <em>6′0″ × 4′0″</em>
          </span>
          <span className={css.fits}>
            <svg width="11" height="11" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 5l3.5 3.5L11 1" />
            </svg>
            Fits
          </span>
        </div>
        <div className={css.fcList}>
          <p className={css.flH}>
            <span className={css.flG}>Generic list · dozens of items</span>
            <span className={css.flP}>
              Example plan · {EXAMPLE.pieces} pieces · ${EXAMPLE.total}
            </span>
          </p>
          <div className={css.flBars}>
            {Array.from({ length: Math.max(36, EXAMPLE_ITEMS.length) }, (_, i) => (
              <i key={i} data-keep={i < EXAMPLE.pieces || undefined} />
            ))}
          </div>
        </div>
      </div>
    </figure>
  );
}
