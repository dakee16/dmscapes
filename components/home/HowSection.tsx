"use client";

import { useRef } from "react";
import Image from "next/image";
import PlanCta from "@/components/site/PlanCta";
import { ArrowRight } from "@/components/ds/Icons";
import { scrub, useScene } from "./flow";
import H2 from "./H2";
import css from "./Home.module.css";

const STEPS = [
  {
    a: "Find your",
    b: "exact dorm.",
    body: "Pick your school, building and room type, and start from its real dimensions.",
    img: "/redesign/home-how-1-hall-floors.webp",
    alt: "An exploded view of a residence hall, floor by floor, with one room highlighted in blue.",
  },
  {
    a: "Make it",
    b: "feel like you.",
    body: "Choose your vibe and set a budget. We handle the bedding, lighting, storage and decor.",
    img: "/redesign/home-how-2-vibe-fan-deck.webp",
    alt: "A fan deck of vibe swatch cards spread open on a brass pivot.",
  },
  {
    a: "Get your",
    b: "room.",
    body: "A 2D layout based on your floor plan, plus a shoppable list with live Amazon links.",
    img: "/redesign/home-how-3-list-laid-out.webp",
    alt: "Everything on the list laid out flat: duvet, pillow, throw, rolled rug, lamp, string lights, storage bins, towel, mirror, plant and desk organizer.",
  },
];

/**
 * 03 · How it works (Skiper Card Stack Scroll). The copy holds while the three
 * steps stack: each card slides up over the one before, which shrinks back,
 * and the tape fills a third per step. Scrubbed by scroll, never by a timer.
 */
export default function HowSection() {
  const grid = useRef<HTMLDivElement>(null);
  useScene((A) => {
    const g = grid.current;
    const cards = g ? Array.from(g.querySelectorAll<HTMLElement>("[data-card]")) : [];
    if (!g || cards.length < 3) return;
    const offs = [1, 2].map((k) => {
      const pin = parseFloat(getComputedStyle(cards[k]).top) || 120;
      return scrub(A, g, `--a${k}`, { target: cards[k], enter: "end start", leave: `top+=${Math.round(pin)} start` });
    });
    return () => offs.forEach((off) => off());
  });

  return (
    <section id="how-it-works" className={css.how} data-bg="#dce1f5" aria-labelledby="how-title">
      <div ref={grid} className={`ds-wrap ${css.howGrid}`}>
        <div className={css.howHead}>
          <p className="ds-eyebrow" data-rv="">
            How it works · 3 steps
          </p>
          <H2 id="how-title" s="From acceptance letter" f="to move-in cart." />
          <p className={`ds-lede ${css.lede}`} data-rv="">
            Three steps between you and a room that actually works, with one free tool to plan, design and shop your
            dorm room.
          </p>
          <div className={css.prog} aria-hidden="true">
            <div className={css.progTrack}>
              <i className={css.progFill} />
            </div>
            <div className={css.progLabels}>
              <span>01</span>
              <span>02</span>
              <span>03</span>
            </div>
          </div>
          <div className={css.ctaRow} data-rv="">
            <PlanCta className="ds-btn ds-btn--ink ds-btn--lg" freeLabel="Plan my room for free" icon={<ArrowRight size={20} />} />
            <span className={css.note}>No account needed to explore</span>
          </div>
        </div>
        <ol className={css.stack}>
          {STEPS.map((s, i) => (
            <li key={s.b} className={css.scard} data-card={i}>
              <div className={css.scArt}>
                <Image src={s.img} alt={s.alt} fill quality={75} sizes="(max-width: 760px) 92vw, 240px" />
              </div>
              <div className={css.scText}>
                <span className={css.badge}>0{i + 1}</span>
                <h3>
                  <span className="ds-display">{s.a}</span> <span className="ds-serif ds-serif--blue">{s.b}</span>
                </h3>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
