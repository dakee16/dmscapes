"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useExperienceMotion } from "@/components/experience/MotionProvider";

/**
 * Scroll-scrubbed image sequence drawn into a canvas (MOTION.md · rendered
 * sequences). Frames load only after the page has finished loading, in
 * bisection order (first, last, middle, quarters…) so a coarse version of the
 * whole move is ready fast; until a frame arrives the nearest loaded one is
 * drawn. Nothing loads on narrow screens, with reduced motion, with the site's
 * pause toggle on, or when the browser asks to save data.
 *
 *   const seq = useFrameSequence(canvasRef, { count: 25, url: i => `/x-${i}.webp` });
 *   useScrub(track, p => seq.draw(p));
 */
export function useFrameSequence(
  canvas: React.RefObject<HTMLCanvasElement | null>,
  {
    count,
    url,
    position = [0.5, 0.5],
    minWidth = 1024,
  }: {
    count: number;
    url: (i: number) => string;
    /** like CSS object-position, as fractions */
    position?: [number, number];
    minWidth?: number;
  }
) {
  const { paused } = useExperienceMotion();
  const frames = useRef<(HTMLImageElement | null)[]>([]);
  const t = useRef(0);
  const drawn = useRef(-1);
  const urlRef = useRef(url);
  urlRef.current = url;
  const [enabled, setEnabled] = useState(false);
  const [showing, setShowing] = useState(false);
  const [px, py] = position;

  const paint = useCallback(() => {
    const c = canvas.current;
    if (!c || !c.width) return;
    const want = Math.round(t.current * (count - 1));
    let k = -1;
    for (let d = 0; d < count && k < 0; d++) {
      if (frames.current[want - d]) k = want - d;
      else if (frames.current[want + d]) k = want + d;
    }
    if (k < 0 || k === drawn.current) return;
    const img = frames.current[k]!;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const s = Math.max(c.width / img.naturalWidth, c.height / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    ctx.drawImage(img, (c.width - w) * px, (c.height - h) * py, w, h);
    drawn.current = k;
  }, [canvas, count, px, py]);

  const draw = useCallback(
    (progress: number) => {
      t.current = Math.min(1, Math.max(0, progress));
      paint();
      // the still underneath is sharper at rest; hand over once we move
      setShowing(t.current > 0.002 && drawn.current >= 0);
    },
    [paint]
  );

  // Decide whether to run at all, then load after the page is idle.
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    if (paused || reduced || saveData || window.innerWidth < minWidth) {
      setEnabled(false);
      setShowing(false);
      return;
    }
    setEnabled(true);
    let cancelled = false;
    const order: number[] = [];
    const seen = new Set<number>();
    const push = (i: number) => {
      if (i >= 0 && i < count && !seen.has(i)) {
        seen.add(i);
        order.push(i);
      }
    };
    push(0);
    push(count - 1);
    for (let step = count - 1; step >= 1; step = Math.floor(step / 2)) {
      for (let i = 0; i < count; i += step) push(i);
      if (step === 1) break;
    }
    for (let i = 0; i < count; i++) push(i);

    const start = () => {
      let next = 0;
      const worker = () => {
        if (cancelled || next >= order.length) return;
        const i = order[next++];
        const img = new Image();
        img.decoding = "async";
        img.src = urlRef.current(i);
        img
          .decode()
          .then(() => {
            if (cancelled) return;
            frames.current[i] = img;
            if (drawn.current < 0 || Math.round(t.current * (count - 1)) !== drawn.current) {
              drawn.current = -1;
              paint();
            }
          })
          .catch(() => {})
          .finally(worker);
      };
      // a few in parallel
      worker();
      worker();
      worker();
    };
    const idle = () => {
      const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
      if (w.requestIdleCallback) w.requestIdleCallback(start, { timeout: 1500 });
      else setTimeout(start, 300);
    };
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", idle, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", idle);
    };
  }, [paused, minWidth, count, paint]);

  // Keep the backing store at device pixels (capped at 2×).
  useEffect(() => {
    const c = canvas.current;
    if (!c || !enabled) return;
    const fit = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = Math.round(c.clientWidth * dpr);
      const h = Math.round(c.clientHeight * dpr);
      if (w && h && (c.width !== w || c.height !== h)) {
        c.width = w;
        c.height = h;
        drawn.current = -1;
        paint();
      }
    };
    const ro = new ResizeObserver(fit);
    ro.observe(c);
    fit();
    return () => ro.disconnect();
  }, [canvas, enabled, paint]);

  return { draw, enabled, showing };
}
