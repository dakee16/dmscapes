"use client";

import { useRef } from "react";
import Image from "next/image";
import { useScene } from "./flow";
import H2 from "./H2";
import css from "./Home.module.css";

type Vibe = {
  id: string;
  name: string;
  plus: boolean;
  line: string;
  rule: string;
  dots: [string, string, string];
};

/**
 * 04 · Vibes (Vengeance Highlight Grid): as the grid scrolls past, the
 * highlight walks through the vibes one cell at a time. The Pro box types its
 * example in CSS; with Motion off it simply shows it.
 */
export default function VibesSection({ vibes }: { vibes: Vibe[] }) {
  const grid = useRef<HTMLDivElement>(null);
  const hl = useRef<HTMLSpanElement>(null);
  useScene((A) => {
    const g = grid.current, h = hl.current;
    if (!g || !h) return;
    const obs = A.onScroll({
      target: g,
      enter: "80% start",
      leave: "35% end",
      onUpdate: (o) => {
        const i = Math.min(vibes.length - 1, Math.floor(o.progress * vibes.length));
        h.style.setProperty("--c", String(i % 3));
        h.style.setProperty("--r", String(Math.floor(i / 3)));
      },
    });
    return () => obs.revert();
  }, [vibes.length]);

  return (
    <section id="vibes" className={css.vibes} data-bg="#f6eada" aria-labelledby="vibes-title">
      <div className={`ds-wrap ${css.vbGrid}`}>
        <div className={css.vbArt}>
          <div className={css.vbIn}>
            <Image
              src="/redesign/home-vibes-duvet-stack.webp"
              alt="A stack of folded duvets, one in each vibe's colors, topped with a white pillow."
              fill
              quality={75}
              sizes="(max-width: 1023px) min(560px, 100vw), 40vw"
            />
          </div>
        </div>
        <div className={css.vbCopy}>
          <p className="ds-eyebrow" data-rv="">
            Style showcase · {vibes.length} styles
          </p>
          <H2 id="vibes-title" s="Pick a vibe." f="We make it fit." />
          <p className={`ds-lede ${css.lede}`} data-rv="">
            Every vibe is a full plan: bedding, lighting, storage and decor, priced to your budget and arranged to your
            floor plan.
          </p>
          <div ref={grid} className={css.hgrid} data-anim="">
            <span ref={hl} className={css.hl} aria-hidden="true" />
            {vibes.map((v) => (
              <div key={v.id} className={css.vibe} data-rv="row" style={{ "--rule": v.rule } as React.CSSProperties}>
                <div className={css.vh}>
                  <span className={css.dots} aria-hidden="true">
                    {v.dots.map((c, i) => (
                      <i key={i} style={{ background: c }} />
                    ))}
                  </span>
                  <h3>{v.name}</h3>
                  <span className={css.tier} data-plus={v.plus || undefined}>
                    {v.plus ? "PLUS" : "FREE"}
                  </span>
                </div>
                <p>{v.line}</p>
              </div>
            ))}
          </div>
          <div className={css.own} data-rv="">
            <div>
              <div className={css.ownH}>
                <h3>Create your own vibe</h3>
                <span className={css.tagPro}>PRO</span>
              </div>
              <p>Describe it in your own words. dormscape finds real products and arranges them for your room and budget.</p>
            </div>
            <span className={css.typed} data-anim="">
              <span className="ds-sr">Example: “Warm oak. Cobalt.”</span>
              <span className={css.tx} aria-hidden="true">
                “Warm oak. Cobalt.”
              </span>
              <span className={css.caret} aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
