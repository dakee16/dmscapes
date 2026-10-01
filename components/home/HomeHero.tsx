"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import Headline from "@/components/ds/Headline";
import { useScrub, span, easeOutExpo } from "@/components/ds/useScrub";
import HomeSearch from "./HomeSearch";
import css from "./Home.module.css";

/**
 * 01 · Hero. On desktop the panel pins for one extra screen: the copy drifts
 * up at a third of scroll speed, the render settles, and the caption naming
 * the real room fades in at the end (MOTION.md · Hero).
 */
export default function HomeHero({
  schoolCount,
  hallCount,
}: {
  schoolCount: number;
  hallCount: number;
}) {
  const track = useRef<HTMLDivElement>(null);
  const copy = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const caption = useRef<HTMLParagraphElement>(null);

  useScrub(
    track,
    (p) => {
      const desktop = window.innerWidth >= 1024;
      const vh = window.innerHeight;
      if (copy.current) {
        copy.current.style.transform = desktop ? `translate3d(0, ${(-p * vh * 0.3).toFixed(1)}px, 0)` : "";
        copy.current.style.opacity = desktop ? String(1 - span(p, 0.55, 1) * 0.6) : "";
      }
      if (art.current) {
        const s = 1.06 - easeOutExpo(p) * 0.06;
        art.current.style.transform = desktop ? `scale(${s.toFixed(4)})` : "";
      }
      if (caption.current) {
        const c = span(p, 0.7, 0.95);
        caption.current.style.opacity = desktop ? String(c) : "";
      }
    },
    { from: [0, 0], to: [1, 1], smooth: 0.5, minWidth: 1024, rest: 0 }
  );

  return (
    <div ref={track} className={css.heroTrack}>
      <section className={css.hero} aria-labelledby="hero-title">
        <div ref={copy} className={css.heroCopy}>
          <div className={css.heroCopyIn}>
            <p className="ds-eyebrow" data-reveal="load">
              AI dorm room planner <span className={css.wide}>· {schoolCount} schools · {hallCount.toLocaleString("en-US")} halls</span>
              <span className={css.narrow}>· free to start</span>
            </p>
            <Headline
              as="h1"
              id="hero-title"
              load
              delayMs={80}
              className={css.heroH1}
              lines={[
                { text: "Your dorm,", riso: true, className: css.l1 },
                { text: "planned to", serif: true, className: css.l2 },
                { text: "the inch.", serif: true, className: css.l3 },
              ]}
            />
            <p className={`ds-lede ${css.heroLede}`} data-reveal="load" style={{ "--i": 4 } as React.CSSProperties}>
              Find your exact room, choose a style and set a budget. Get a layout that fits and a shoppable
              list, before move-in day.
            </p>
            <div className={css.heroSearchWrap} data-reveal="load" style={{ "--i": 5 } as React.CSSProperties}>
              <HomeSearch />
            </div>
            <p className={`ds-mono ${css.note} ${css.heroSub}`} data-reveal="load" style={{ "--i": 6 } as React.CSSProperties}>
              <span>No account needed to explore</span>
              <span className={css.dot} aria-hidden="true" />
              <span>Saving is always free</span>
            </p>
          </div>
        </div>
        <div ref={art} className={css.heroArt}>
          <Image
            src="/redesign/home-hero-room-over-plan.jpg"
            alt="A furnished dorm room floating above its own floor plan, with dashed guide lines linking its corners to the drawing, marked 15 feet 3 inches by 11 feet 8 inches."
            fill
            preload
            quality={80}
            sizes="(min-width: 1024px) 53vw, 100vw"
          />
        </div>
        <p ref={caption} className={css.heroCaption}>
          Real room ·{" "}
          <Link href="/colleges/northwestern/elder-hall">Northwestern, Elder Hall</Link> · <span className={css.ft}>15′3″ × 11′8″</span>
        </p>
      </section>
    </div>
  );
}
