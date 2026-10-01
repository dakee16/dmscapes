"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * One observer for the whole redesign motion system (MOTION.md · The system).
 *
 * Server components mark elements with data attributes instead of wrapping
 * them in client components:
 *   data-reveal       rise 24px + fade, 600ms, out-expo
 *   data-reveal-img   same, with a 1.02 → 1 settle
 *   data-headline     each `.ds-line` rises out of its mask, 90ms apart
 *   data-draw         a rule draws left to right
 *   data-grow         a to-scale rectangle grows from its top-left corner
 *   data-bar          a bar grows from its baseline
 *   data-pop          a badge pops in
 *   data-count        the number counts up once (1.2s, tabular figures)
 *
 * Value "" animates when 20% of the element is in view; "load" animates on
 * first paint even if it starts on screen. A parent with data-stagger spaces
 * its animated children 80ms apart (via --i). Elements already visible at
 * load are left alone, so nothing flashes, and without JS nothing is hidden.
 */
const KINDS = [
  "data-reveal",
  "data-reveal-img",
  "data-headline",
  "data-draw",
  "data-grow",
  "data-bar",
  "data-pop",
] as const;
const SELECTOR = KINDS.map((k) => `[${k}]:not([${k}="in"]):not([${k}="armed"])`).join(",") + ",[data-count]:not([data-count-done])";

function motionPaused(): boolean {
  if (typeof window === "undefined") return true;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return true;
  return document.querySelector(".dm-app")?.getAttribute("data-motion") === "paused";
}

function kindOf(el: Element): (typeof KINDS)[number] | null {
  for (const k of KINDS) if (el.hasAttribute(k)) return k;
  return null;
}

function countUp(el: HTMLElement) {
  el.setAttribute("data-count-done", "");
  const target = Number(el.dataset.count);
  if (!Number.isFinite(target) || motionPaused()) return;
  const decimals = Number(el.dataset.countDecimals ?? 0);
  const fmt = (v: number) =>
    v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const start = performance.now();
  const dur = 1200;
  const tick = (now: number) => {
    const t = Math.min(1, (now - start) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = fmt(target * eased);
    if (t < 1) requestAnimationFrame(tick);
    else el.textContent = fmt(target);
  };
  el.textContent = fmt(0);
  requestAnimationFrame(tick);
}

export default function RevealObserver() {
  const pathname = usePathname();

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const el = entry.target as HTMLElement;
          const vh = window.innerHeight;
          const enough =
            entry.intersectionRatio >= 0.2 || entry.intersectionRect.height >= vh * 0.2;
          if (!entry.isIntersecting || !enough) continue;
          io.unobserve(el);
          if (el.hasAttribute("data-count") && !el.hasAttribute("data-count-done")) countUp(el);
          const kind = kindOf(el);
          if (kind) el.setAttribute(kind, "in");
        }
      },
      { threshold: [0, 0.2, 0.5] }
    );

    let frame = 0;
    function scan() {
      frame = 0;
      const paused = motionPaused();
      const vh = window.innerHeight;
      const nodes = document.querySelectorAll<HTMLElement>(SELECTOR);
      nodes.forEach((el) => {
        const kind = kindOf(el);
        const parent = el.parentElement;
        if (parent?.hasAttribute("data-stagger")) {
          const siblings = Array.from(parent.children).filter((c) => kindOf(c));
          el.style.setProperty("--i", String(Math.max(0, siblings.indexOf(el))));
        }
        if (kind === "data-headline") {
          el.querySelectorAll<HTMLElement>(".ds-line").forEach((line, i) => line.style.setProperty("--l", String(i)));
        }
        const rect = el.getBoundingClientRect();
        const onScreen = rect.top < vh * 0.98 && rect.bottom > 0;
        const onLoad = kind ? el.getAttribute(kind) === "load" : el.dataset.countOn === "load";

        if (paused) {
          if (kind) el.setAttribute(kind, "in");
          if (el.hasAttribute("data-count")) el.setAttribute("data-count-done", "");
          return;
        }
        if (onScreen && !onLoad) {
          // Already visible on arrival: leave it be, no flash.
          if (kind) el.setAttribute(kind, "in");
          if (el.hasAttribute("data-count")) el.setAttribute("data-count-done", "");
          return;
        }
        if (kind) el.setAttribute(kind, "armed");
        if (onScreen && onLoad) {
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              if (kind) el.setAttribute(kind, "in");
              if (el.hasAttribute("data-count") && !el.hasAttribute("data-count-done")) countUp(el);
            })
          );
          return;
        }
        io.observe(el);
      });
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(scan);
    };
    schedule();
    const mo = new MutationObserver(schedule);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      mo.disconnect();
      io.disconnect();
    };
  }, [pathname]);

  return null;
}
