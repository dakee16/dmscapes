"use client";

import { useEffect, useRef } from "react";
import { useExperienceMotion } from "@/components/experience/MotionProvider";
import css from "./Home.module.css";

/**
 * The measuring-tape band under the hero. It drifts at 40 px/s, speeds up to
 * 3× while you scroll fast, and runs backwards when you scroll up
 * (MOTION.md · Tape band). Paused or reduced motion: it holds still.
 */
export default function TapeBand({ layoutCount }: { layoutCount: number }) {
  const band = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const { paused } = useExperienceMotion();

  useEffect(() => {
    const el = track.current;
    const root = band.current;
    if (!el || !root) return;
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.style.transform = "";
      return;
    }
    let x = 0;
    let dir = 1;
    let boost = 0;
    let lastY = window.scrollY;
    let last = performance.now();
    let raf = 0;
    let visible = false;

    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - lastY;
      lastY = y;
      if (Math.abs(dy) > 0.5) dir = dy > 0 ? 1 : -1;
      boost = Math.min(2, boost + Math.abs(dy) / 60);
    };
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      boost *= Math.exp(-dt / 0.35);
      const half = el.scrollWidth / 2;
      x -= dir * 40 * (1 + boost) * dt;
      if (half > 0) {
        if (x <= -half) x += half;
        if (x > 0) x -= half;
      }
      el.style.transform = `translate3d(${x.toFixed(2)}px, 0, 0)`;
      raf = visible ? requestAnimationFrame(loop) : 0;
    };
    const io = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !raf) {
        last = performance.now();
        raf = requestAnimationFrame(loop);
      }
    });
    io.observe(root);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, [paused]);

  const items = [
    <>
      <span className="ds-num" data-count={layoutCount} data-count-on="load">
        {layoutCount.toLocaleString("en-US")}
      </span>{" "}
      dorm layouts
    </>,
    <>$200 to $1,500 budgets</>,
    <>Live Amazon links</>,
    <>Real, building-specific dimensions</>,
  ];
  const set = (hidden: boolean) => (
    <div className={css.tapeSet} aria-hidden={hidden || undefined}>
      {items.map((item, i) => (
        <span key={i} style={{ display: "contents" }}>
          <span>{hidden && i === 0 ? <>{layoutCount.toLocaleString("en-US")} dorm layouts</> : item}</span>
          <span className={css.diamond} aria-hidden="true" />
        </span>
      ))}
    </div>
  );

  return (
    <div ref={band} className={css.tapeBand}>
      <p className="ds-sr">
        {layoutCount.toLocaleString("en-US")} dorm layouts. Budgets from $200 to $1,500. Live Amazon links. Real,
        building-specific dimensions.
      </p>
      <div ref={track} className={css.tapeTrack} aria-hidden="true">
        {set(false)}
        {set(true)}
        {set(true)}
        {set(true)}
      </div>
    </div>
  );
}
