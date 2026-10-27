"use client";

import { useEffect, useRef, type RefObject } from "react";
import css from "./SectionRail.module.css";

/**
 * A rail of section ticks at the right edge (Kokonut Scroll Index): it marks the section you're in and names
 * each on hover or focus. It shows while `scope` (the homepage flow) is mid-screen, or else from the first
 * section to the end of the last. Wide screens only; links jump to the section, clear of the header.
 */
export default function SectionRail({ sections, scope }: { sections: { id: string; label: string }[]; scope?: RefObject<HTMLElement | null> }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const nav = ref.current;
    if (!nav) return;
    const links = Array.from(nav.querySelectorAll("a"));
    const targets = links.map((a) => document.getElementById(a.hash.slice(1)));
    for (const t of targets) if (t && getComputedStyle(t).scrollMarginTop === "0px") t.style.scrollMarginTop = "96px";
    const last = targets.filter(Boolean).at(-1);
    const end = last?.closest("section") ?? last;
    nav.dataset.js = "";
    let ticking = false;
    const update = () => {
      ticking = false;
      const mid = window.innerHeight * 0.45;
      let idx = -1;
      targets.forEach((t, i) => {
        if (t && t.getBoundingClientRect().top <= mid) idx = i;
      });
      const box = scope?.current?.getBoundingClientRect();
      const first = targets.find(Boolean)?.getBoundingClientRect();
      const shown = box ? box.top < mid && box.bottom > mid : !!first && !!end && first.top < window.innerHeight * 0.7 && end.getBoundingClientRect().bottom > mid;
      nav.toggleAttribute("data-show", shown);
      nav.toggleAttribute("data-dark", idx >= 0 && !!targets[idx]?.closest("[data-dark]"));
      links.forEach((a, i) => {
        if (i === idx) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
        a.toggleAttribute("data-done", i < idx);
      });
    };
    const schedule = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [scope]);

  return (
    <nav ref={ref} className={css.rail} aria-label="Sections on this page">
      {sections.map((r) => (
        <a key={r.id} href={`#${r.id}`}>
          <span>{r.label}</span>
          <i aria-hidden="true" />
        </a>
      ))}
    </nav>
  );
}
