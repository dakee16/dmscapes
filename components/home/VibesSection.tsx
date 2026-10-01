"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Headline from "@/components/ds/Headline";
import { useScrub } from "@/components/ds/useScrub";
import { useExperienceMotion } from "@/components/experience/MotionProvider";
import css from "./Home.module.css";

type Vibe = {
  id: string;
  name: string;
  plus: boolean;
  line: string;
  rule: string;
  dots: [string, string, string];
};

const TYPED = "“Warm oak. Cobalt.”";

/**
 * 04 · Vibes. As the grid scrolls through, each vibe takes its turn (thicker
 * rule, full strength); once the last one has had its moment all nine settle
 * back to full. The Pro box types its example once.
 */
export default function VibesSection({ vibes }: { vibes: Vibe[] }) {
  const grid = useRef<HTMLDivElement>(null);
  const own = useRef<HTMLDivElement>(null);
  const last = useRef("");
  const [typed, setTyped] = useState(TYPED);
  const { paused } = useExperienceMotion();

  useScrub(
    grid,
    (p) => {
      const el = grid.current;
      if (!el) return;
      const v = p >= 1 || p <= 0 ? (p <= 0 ? "" : "all") : String(Math.min(vibes.length - 1, Math.floor(p * vibes.length)));
      if (v === last.current) return;
      last.current = v;
      if (!v) el.removeAttribute("data-active");
      else el.setAttribute("data-active", v);
      el.querySelectorAll<HTMLElement>("[data-vibe]").forEach((card, i) => {
        card.dataset.on = String(v === "all" || String(i) === v);
      });
    },
    { from: [0, 0.75], to: [1, 0.3], smooth: 0.25, rest: 1.01 }
  );

  useEffect(() => {
    const el = own.current;
    if (!el || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setTyped(TYPED);
      return;
    }
    let timer = 0;
    let started = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || started) return;
        started = true;
        io.disconnect();
        let n = 0;
        const step = () => {
          n += 1;
          setTyped(TYPED.slice(0, n));
          if (n < TYPED.length) timer = window.setTimeout(step, n === 1 ? 260 : 55 + Math.random() * 60);
        };
        setTyped("");
        timer = window.setTimeout(step, 400);
      },
      { threshold: 0.6 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimeout(timer);
    };
  }, [paused]);

  return (
    <section id="vibes" className={`${css.section} ${css.vibes}`} aria-labelledby="vibes-title">
      <div className={`${css.inner} ${css.vibesGrid}`}>
        <div className={css.vibesArt} data-reveal-img="">
          <Image
            src="/redesign/home-vibes-duvet-stack.jpg"
            alt="A stack of folded duvets, one in each vibe's colors, topped with a white pillow."
            fill
            quality={75}
            sizes="(min-width: 1024px) 40vw, 100vw"
          />
        </div>
        <div className={css.vibesCopy}>
          <div className={css.vibesCopyHead}>
            <p className={`ds-eyebrow ${css.eyebrowGap}`} data-reveal="">
              Style showcase · {vibes.length} styles
            </p>
            <Headline
              id="vibes-title"
              className={css.h2b}
              lines={[
                { text: "Pick a vibe.", className: css.s },
                { text: "We make it fit.", serif: true, className: css.f },
              ]}
            />
            <p className={`ds-lede ${css.vibeLede}`} data-reveal="">
              Every vibe is a full plan: bedding, lighting, storage and decor, priced to your budget and arranged to
              your floor plan.
            </p>
          </div>
          <div ref={grid} className={css.vibeCards} data-stagger="">
            {vibes.map((v) => (
              <div
                key={v.id}
                className={css.vibe}
                data-vibe=""
                data-reveal=""
                style={{ "--rule": v.rule } as React.CSSProperties}
              >
                <div className={css.vibeHead}>
                  <span className={css.dots} aria-hidden="true">
                    {v.dots.map((c, i) => (
                      <span key={i} style={{ background: c }} />
                    ))}
                  </span>
                  <h3 className={css.vibeName}>{v.name}</h3>
                  <span className={css.vibeTier} data-plus={v.plus}>
                    {v.plus ? "PLUS" : "FREE"}
                  </span>
                </div>
                <p>{v.line}</p>
              </div>
            ))}
          </div>
          <div ref={own} className={css.ownVibe} data-reveal="">
            <svg className={css.ownBorder} aria-hidden="true">
              <rect x="0.75" y="0.75" rx="14" />
            </svg>
            <div>
              <div className={css.ownHead}>
                <h3>Create your own vibe</h3>
                <span className={`ds-tag ${css.proTag}`}>PRO</span>
              </div>
              <p>Describe it in your own words. Dormscape finds real products and arranges them for your room and budget.</p>
            </div>
            <span className={css.typed}>
              <span className="ds-sr">Example: {TYPED}</span>
              <span aria-hidden="true">{typed}</span>
              <span className={css.caret} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
