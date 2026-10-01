"use client";

import { useRef } from "react";
import Image from "next/image";
import Headline from "@/components/ds/Headline";
import PlanCta from "@/components/site/PlanCta";
import { ArrowRight } from "@/components/ds/Icons";
import { useScrub, span } from "@/components/ds/useScrub";
import css from "./Home.module.css";

const STEPS = [
  {
    n: "01",
    a: "Find your",
    b: "exact dorm.",
    body: "Pick your school, building and room type, and start from its real dimensions.",
    img: "/redesign/home-how-1-hall-floors.jpg",
    alt: "An exploded view of a residence hall, floor by floor, with one room highlighted in blue.",
  },
  {
    n: "02",
    a: "Make it",
    b: "feel like you.",
    body: "Choose your vibe and set a budget. We handle the bedding, lighting, storage and decor.",
    img: "/redesign/home-how-2-vibe-fan-deck.jpg",
    alt: "A fan deck of vibe swatch cards spread open on a brass pivot.",
  },
  {
    n: "03",
    a: "Get your",
    b: "room.",
    body: "A 2D layout based on your floor plan, plus a shoppable list with live Amazon links.",
    img: "/redesign/home-how-3-list-laid-out.jpg",
    alt: "Everything on the list laid out flat: duvet, pillow, throw, rolled rug, lamp, string lights, storage bins, towel, mirror, plant and desk organizer.",
  },
];

/**
 * 03 · How it works. Desktop pins for three screens: the tape fills as you
 * scroll and each step takes the stage in turn (MOTION.md · How it works).
 * Phones get a simple stack that reveals as it scrolls.
 */
export default function HowSection() {
  const track = useRef<HTMLDivElement>(null);
  const pin = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const cta = useRef<HTMLDivElement>(null);
  const active = useRef(-2);

  useScrub(
    track,
    (p) => {
      const desktop = window.innerWidth >= 1024;
      const a = !desktop ? -1 : p < 0.36 ? 0 : p < 0.68 ? 1 : 2;
      if (fill.current) fill.current.style.transform = desktop ? `scaleX(${span(p, 0.04, 0.92).toFixed(4)})` : "";
      if (a !== active.current && pin.current) {
        active.current = a;
        if (a < 0) pin.current.removeAttribute("data-active");
        else pin.current.setAttribute("data-active", String(a));
      }
      if (cta.current) cta.current.dataset.done = String(!desktop || p > 0.8);
    },
    { from: [0, 0], to: [1, 1], smooth: 0.35, minWidth: 1024, rest: 1 }
  );

  return (
    <section id="how-it-works" className={`${css.section} ${css.how}`} aria-labelledby="how-title">
      <div ref={track} className={css.howTrack}>
        <div ref={pin} className={css.howPin}>
          <div className={`${css.inner} ${css.howHead}`}>
            <p className={`ds-eyebrow ${css.eyebrowGap}`} data-reveal="">
              How it works · 3 steps
            </p>
            <Headline
              id="how-title"
              className={css.howH}
              lines={[
                { text: "From acceptance letter", className: css.s },
                { text: "to move-in cart.", serif: true, className: css.f },
              ]}
            />
            <p className={`ds-lede ${css.howLede}`} data-reveal="">
              Three steps between you and a room that actually works.
            </p>
            <div className={css.howProgress} aria-hidden="true">
              <div ref={fill} className={css.howProgressFill} />
            </div>
          </div>
          <ol className={`${css.inner} ${css.steps}`} style={{ listStyle: "none", padding: 0 }}>
            {STEPS.map((s) => (
              <li key={s.n} className={css.step} data-reveal-img="">
                <div className={css.stepArt}>
                  <Image src={s.img} alt={s.alt} fill quality={75} sizes="(min-width: 1024px) 33vw, 100vw" />
                </div>
                <div className={css.stepText}>
                  <span className={css.badge}>{s.n}</span>
                  <h3 className={css.stepH}>
                    <span className={`ds-display ${css.s}`}>{s.a}</span>
                    <br />
                    <span className={`ds-serif ds-serif--blue ${css.f}`}>{s.b}</span>
                  </h3>
                  <p>{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div ref={cta} className={`${css.inner} ${css.howCta}`} data-done="true">
            <div className={css.ctaRow}>
              <PlanCta
                className="ds-btn ds-btn--ink ds-btn--lg"
                freeLabel="Plan my room for free"
                icon={<ArrowRight size={20} />}
              />
              <span className={css.note}>No account needed to explore</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
