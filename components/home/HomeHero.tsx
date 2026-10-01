"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import Headline from "@/components/ds/Headline";
import { useScrub, span, easeOutExpo } from "@/components/ds/useScrub";
import { useFrameSequence } from "@/components/ds/useFrameSequence";
import HomeSearch from "./HomeSearch";
import css from "./Home.module.css";

/**
 * 01 · Hero. On desktop the panel pins for one extra screen: the copy drifts
 * up at a third of scroll speed, the room lowers onto its own floor plan
 * (a rendered frame sequence), and the caption naming the real room fades in
 * as it lands (MOTION.md · Hero).
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

  const canvas = useRef<HTMLCanvasElement>(null);
  // The room settles onto its own floor plan as you scroll: 25 rendered frames.
  const seq = useFrameSequence(canvas, {
    count: 25,
    url: (i) => `/redesign/seq/hero-${String(i).padStart(2, "0")}.webp`,
    position: [0.5, 0.55],
  });

  useScrub(
    track,
    (p) => {
      // -1: motion off or narrow screen. Everything sits still and visible.
      const still = p < 0;
      const vh = window.innerHeight;
      if (copy.current) {
        copy.current.style.transform = still ? "" : `translate3d(0, ${(-p * vh * 0.3).toFixed(1)}px, 0)`;
        copy.current.style.opacity = still ? "" : String(1 - span(p, 0.55, 1) * 0.6);
      }
      if (art.current) {
        art.current.style.transform = still ? "" : `scale(${(1.03 - easeOutExpo(p) * 0.03).toFixed(4)})`;
      }
      if (caption.current) {
        caption.current.style.opacity = still ? "1" : String(span(p, 0.68, 0.9));
      }
      if (!still) {
        const k = span(p, 0.04, 0.72);
        seq.draw(k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);
      }
    },
    { from: [0, 0], to: [1, 1], smooth: 0.5, minWidth: 1024, rest: -1 }
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
          {seq.enabled && (
            <canvas ref={canvas} className={css.heroCanvas} data-show={seq.showing || undefined} aria-hidden="true" />
          )}
        </div>
        <p ref={caption} className={css.heroCaption}>
          Real room ·{" "}
          <Link href="/colleges/northwestern/elder-hall">Northwestern, Elder Hall</Link> · <span className={css.ft}>15′3″ × 11′8″</span>
        </p>
      </section>
    </div>
  );
}
