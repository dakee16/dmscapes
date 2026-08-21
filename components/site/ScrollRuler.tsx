"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

// On-brand scroll-progress signature: a ruler down each open margin, reinforcing
// "planned to the inch." Both rails read the SAME scrollYProgress, so they are
// perfectly synced by construction. Wide-desktop only (hidden below xl, where
// there's no margin space); transform/opacity-only; static under reduced motion.
//
// Homepage-only by request. If we ever want it on other long-scroll pages
// (blog, pricing), lift it into the layout behind a per-route flag, a separate
// follow-up, deliberately not done here.

// The tick pattern: short horizontal ticks every 13px, a longer major tick every
// 5th. Pure CSS gradients, masked to fade at the ends.
const TICK_BG =
  "repeating-linear-gradient(to bottom, var(--tick) 0 1px, transparent 1px 13px)";
const MAJOR_BG =
  "repeating-linear-gradient(to bottom, var(--tick) 0 1.5px, transparent 1.5px 65px)";
const FADE_MASK =
  "linear-gradient(to bottom, transparent, #000 12%, #000 88%, transparent)";

function Rail({ side }: { side: "left" | "right" }) {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  // Marker rides the full rail height; inset a touch so it never clips the ends.
  const top = useTransform(scrollYProgress, [0, 1], ["3%", "97%"]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-y-0 z-30 hidden w-8 xl:block ${
        side === "left" ? "left-3 2xl:left-6" : "right-3 2xl:right-6"
      }`}
      style={{ ["--tick" as string]: "rgba(23,23,43,0.16)" }}
    >
      {/* Center hairline */}
      <div
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-ink/12"
        style={{ WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK }}
      />
      {/* Minor + major ticks, centered, faded at the ends */}
      <div
        className="absolute inset-y-0 left-1/2 w-2 -translate-x-1/2"
        style={{ backgroundImage: TICK_BG, WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK }}
      />
      <div
        className="absolute inset-y-0 left-1/2 w-3.5 -translate-x-1/2"
        style={{ backgroundImage: MAJOR_BG, WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK }}
      />

      {reduce ? (
        // Reduced motion: a static filled top segment, no moving marker.
        <div className="absolute left-1/2 top-[3%] h-[10%] w-px -translate-x-1/2 bg-cobalt/60" />
      ) : (
        <>
          {/* Progress fill: the hairline turns cobalt from the top down to here. */}
          <motion.div
            className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 origin-top bg-cobalt/70"
            style={{ scaleY: scrollYProgress, WebkitMaskImage: FADE_MASK, maskImage: FADE_MASK }}
          />
          {/* The position marker: a bold cobalt tick with a small notch. */}
          <motion.div
            className="absolute left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center"
            style={{ top }}
          >
            <span className="block h-[2.5px] w-5 rounded-full bg-cobalt shadow-[0_0_10px_rgba(43,78,255,0.5)]" />
            <span className="absolute left-1/2 h-2 w-2 -translate-x-1/2 rounded-full border-[2.5px] border-cobalt bg-paper" />
          </motion.div>
        </>
      )}
    </div>
  );
}

export default function ScrollRuler() {
  return (
    <>
      <Rail side="left" />
      <Rail side="right" />
    </>
  );
}
