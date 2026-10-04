"use client";

import { useEffect, useRef } from "react";
import { useExperienceMotion } from "@/components/experience/MotionProvider";

/**
 * Scroll-linked progress for one element, smoothed (MOTION.md: "tied to scroll
 * with 0.6 s smoothing"). Progress is 0 when the point at `from[0]` of the
 * element (0 = its top, 1 = its bottom) sits at `from[1]` of the viewport
 * (0 = top, 1 = bottom), and 1 when `to` lines up the same way.
 *
 *   from: [0, 0.8], to: [0.5, 0.4]  // image top at 80% → its middle at 40%
 *   from: [0, 0],   to: [1, 1]      // a sticky track, top to bottom
 *
 * The callback runs on animation frames only while the element is near the
 * viewport. With motion paused or reduced, it reports the end state once.
 */
export interface ScrubOptions {
  from: [number, number];
  to: [number, number];
  /** smoothing time in seconds; 0 for raw */
  smooth?: number;
  /** skip scrubbing below this viewport width (mobile plays once instead) */
  minWidth?: number;
  /** value reported when motion is off or the scrub is disabled */
  rest?: number;
}

export function useScrub(
  ref: React.RefObject<HTMLElement | null>,
  onProgress: (p: number) => void,
  { from, to, smooth = 0.6, minWidth = 0, rest = 1 }: ScrubOptions
) {
  const { paused } = useExperienceMotion();
  const cb = useRef(onProgress);
  cb.current = onProgress;
  const [f0, f1] = from;
  const [t0, t1] = to;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const narrow = () => window.innerWidth < minWidth;
    if (paused || reduced) {
      cb.current(rest);
      return;
    }
    let visible = false;
    let raf = 0;
    let current = -1;
    let last = performance.now();
    const measure = () => {
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const a0 = f1 * vh - f0 * r.height;
      const a1 = t1 * vh - t0 * r.height;
      if (a1 === a0) return 1;
      return Math.min(1, Math.max(0, (r.top - a0) / (a1 - a0)));
    };
    const loop = (now: number) => {
      raf = 0;
      if (narrow()) {
        cb.current(rest);
        return;
      }
      const target = measure();
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (current < 0 || smooth <= 0) current = target;
      else current += (target - current) * (1 - Math.exp(-dt / (smooth / 3)));
      if (Math.abs(target - current) < 0.0005) current = target;
      cb.current(current);
      if (visible && current !== target) raf = requestAnimationFrame(loop);
    };
    const kick = () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    };
    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        if (visible) kick();
      },
      { rootMargin: "25% 0px 25% 0px" }
    );
    io.observe(el);
    window.addEventListener("scroll", kick, { passive: true });
    window.addEventListener("resize", kick);
    kick();
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", kick);
      window.removeEventListener("resize", kick);
      cancelAnimationFrame(raf);
    };
  }, [ref, paused, f0, f1, t0, t1, smooth, minWidth, rest]);
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
/** Map p from [a, b] onto 0..1, clamped. */
export const span = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));
export const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
