"use client";

import { useEffect, useRef, useState } from "react";
import { useStill } from "@/components/ds/useStill";
import { loadAnime, scrub } from "./flow";
import css from "./Home.module.css";

/**
 * Everything below the hero scrolls as one piece (MOTION.md · Homepage below
 * the hero). Sections sit on one background where each section's colour
 * (data-bg) blends into the next; headlines, copy and pictures marked data-rv
 * are scrubbed by scroll with anime.js; a section rail shows where you are. Nothing plays on a timer and nothing holds the scroll. Without
 * JS, or with Motion off, the page is simply its finished self.
 */
export default function HomeFlow({ rail, children }: { rail: { id: string; label: string }[]; children: React.ReactNode }) {
  const flowRef = useRef<HTMLDivElement>(null);
  const railRef = useRef<HTMLElement>(null);
  const still = useStill();
  const [live, setLive] = useState(false);

  // One continuous background: each painted section keeps its colour and blends into the next.
  useEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    const dark = (el?: HTMLElement) => el?.dataset.dark !== undefined;
    const paint = () => {
      const secs = Array.from(flow.querySelectorAll<HTMLElement>(":scope > section[data-bg]"));
      const stops = ["#fbfaf6 0px"];
      secs.forEach((sec, i) => {
        const top = sec.offsetTop, h = sec.offsetHeight, prev = secs[i - 1], next = secs[i + 1];
        const bIn = i === 0 ? 220 : Math.min(dark(sec) || dark(prev) ? 200 : 340, h * 0.3);
        const bOut = !next ? 0 : Math.min(dark(sec) || dark(next) ? 200 : 340, h * 0.3);
        stops.push(`${sec.dataset.bg} ${Math.round(top + bIn / 2)}px`, `${sec.dataset.bg} ${Math.round(top + h - bOut / 2)}px`);
      });
      flow.style.backgroundImage = `linear-gradient(180deg,${stops.join(",")})`;
    };
    flow.dataset.js = "";
    paint();
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(paint);
    });
    ro.observe(flow);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  // The section rail (Kokonut Scroll Index): shows while the flow is mid-screen, marks where you are.
  useEffect(() => {
    const flow = flowRef.current, nav = railRef.current;
    if (!flow || !nav) return;
    const links = Array.from(nav.querySelectorAll("a"));
    const targets = links.map((a) => document.getElementById(a.hash.slice(1)));
    let ticking = false;
    const track = () => {
      ticking = false;
      const mid = window.innerHeight * 0.45;
      let idx = -1;
      targets.forEach((t, i) => {
        if (t && t.getBoundingClientRect().top <= mid) idx = i;
      });
      const fr = flow.getBoundingClientRect();
      nav.toggleAttribute("data-show", fr.top < mid && fr.bottom > mid);
      nav.toggleAttribute("data-dark", idx >= 0 && targets[idx]?.dataset.dark !== undefined);
      links.forEach((a, i) => {
        if (i === idx) a.setAttribute("aria-current", "location");
        else a.removeAttribute("aria-current");
        a.toggleAttribute("data-done", i < idx);
      });
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(track);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    track();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Scroll-scrubbed reveals, only while motion is on.
  useEffect(() => {
    setLive(!still);
    if (still) return;
    let dead = false;
    const offs: (() => void)[] = [];
    loadAnime().then((A) => {
      const flow = flowRef.current;
      if (dead || !flow) return;
      const all = (sel: string) => Array.from(flow.querySelectorAll<HTMLElement>(sel));
      const reveal = (el: HTMLElement, enter = "end start", leave = "74% start") =>
        offs.push(scrub(A, el, "--p", { target: el, enter, leave }));
      // Skiper Horizontal Text Reveal: each headline's two lines slide in from opposite sides.
      all('[data-rv="h2"]').forEach((h) => reveal(h, "end start", "56% start"));
      all('[data-rv=""]').forEach((el) => reveal(el));
      // A row of cards arrives left to right: each column starts a little later.
      const rows = new Map<Element | null, Map<number, HTMLElement[]>>();
      all('[data-rv="row"]').forEach((el) => {
        const byTop = rows.get(el.parentElement) ?? new Map<number, HTMLElement[]>();
        const top = Math.round(el.offsetTop / 8);
        byTop.set(top, [...(byTop.get(top) ?? []), el]);
        rows.set(el.parentElement, byTop);
      });
      rows.forEach((byTop) =>
        byTop.forEach((row) =>
          row.sort((a, b) => a.offsetLeft - b.offsetLeft).forEach((el, j) => reveal(el, `end-=${j * 70} start`, `${74 - j * 6}% start`)),
        ),
      );
      // Skiper Scroll Image Reveal plus Parallax Scroll on the big pictures.
      all('[data-rv="img"]').forEach((el) => {
        offs.push(scrub(A, el, "--p", { target: el, enter: "end start", leave: "42% start" }));
        offs.push(scrub(A, el, "--v", { target: el, enter: "end start", leave: "start end" }));
      });
      // Kokonut Marker Text, filled by scroll.
      all('[data-rv="marker"]').forEach((m) => offs.push(scrub(A, m, "--p", { target: m, enter: "88% start", leave: "50% start" })));
    });
    return () => {
      dead = true;
      offs.forEach((off) => off());
    };
  }, [still]);

  return (
    <div ref={flowRef} className={live ? `${css.flow} ${css.live}` : css.flow}>
      <nav ref={railRef} className={css.rail} aria-label="Sections on this page">
        {rail.map((r) => (
          <a key={r.id} href={`#${r.id}`}>
            <span>{r.label}</span>
            <i aria-hidden="true" />
          </a>
        ))}
      </nav>
      {children}
    </div>
  );
}
