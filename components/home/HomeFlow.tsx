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

  // One continuous background: each painted section keeps its colour and blends into the next,
  // eased and mixed in Oklab so light-to-dark steps darken evenly instead of through a grey band.
  useEffect(() => {
    const flow = flowRef.current;
    if (!flow) return;
    const dark = (el?: HTMLElement) => el?.dataset.dark !== undefined;
    const paint = () => {
      const secs = Array.from(flow.querySelectorAll<HTMLElement>(":scope > section[data-bg]"));
      const stops: string[] = [];
      let from = "#fbfaf6", fromH = Infinity;
      secs.forEach((sec, i) => {
        const at = sec.offsetTop, h = sec.offsetHeight, to = sec.dataset.bg!;
        // How far each blend reaches above and below the seam. Into a dark section it reaches further on the
        // dark side (light copy reads fine on a darkening ground); out of one it stays short on both sides,
        // where the dark section's last buttons and the next section's picture sit.
        const [up, down] = i === 0 ? [0, 110] : dark(sec) ? [130, 260] : dark(secs[i - 1]) ? [150, 100] : [170, 170];
        const a = at - Math.min(up, fromH * 0.3), b = at + Math.min(down, h * 0.3);
        for (let k = 0; k <= 12; k++) {
          const t = k / 12;
          stops.push(`${mixOklab(from, to, t * t * (3 - 2 * t))} ${Math.round(a + (b - a) * t)}px`);
        }
        from = to;
        fromH = h;
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

/** Mix two #rrggbb colours in Oklab (t = 0 gives `a`, 1 gives `b`) and return #rrggbb. */
function mixOklab(a: string, b: string, t: number) {
  const lab = (hex: string) => {
    const [r, g, bl] = [1, 3, 5].map((i) => {
      const c = parseInt(hex.slice(i, i + 2), 16) / 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * bl);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * bl);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * bl);
    return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
  };
  const [L, A, B] = lab(a).map((v, i) => v + (lab(b)[i] - v) * t);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3, m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3, s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return "#" + [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.max(c, 0) ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255).toString(16).padStart(2, "0");
  }).join("");
}
