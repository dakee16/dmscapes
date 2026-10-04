"use client";

import { useEffect, useRef } from "react";
import css from "./Post.module.css";

/**
 * The tape measure under the nav that fills as you read the post body
 * (MOTION.md · Blog post). Scroll-linked, so it simply tracks position;
 * nothing animates on its own.
 */
export default function ReadingBar({ targetId }: { targetId: string }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = document.getElementById(targetId);
    const node = bar.current;
    if (!el || !node) return;
    let raf = 0;
    let last = -1;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const top = node.getBoundingClientRect().bottom;
      const span = r.height - (window.innerHeight - top);
      const p = span <= 0 ? 1 : Math.min(1, Math.max(0, (top - r.top) / span));
      node.style.setProperty("--p", p.toFixed(4));
      const pct = Math.round(p * 100);
      if (pct !== last) {
        last = pct;
        node.setAttribute("aria-valuenow", String(pct));
      }
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [targetId]);

  return (
    <div
      ref={bar}
      className={css.readingBar}
      role="progressbar"
      aria-label="Reading progress"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={0}
    >
      <span className={css.readingFill} />
      <span className={css.readingThumb} />
    </div>
  );
}
