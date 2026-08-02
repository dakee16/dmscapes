"use client";

import { useEffect, useRef } from "react";

// Cursor-reactive graph paper: a stronger copy of the 28px grid, masked to a
// soft halo that follows the pointer. Must be rendered inside a .grid-paper
// background layer; it inherits that layer's fade mask and grid origin, so
// the base texture stays untouched and perfectly aligned.
export default function CursorGrid() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

    let x = 0;
    let y = 0;
    let raf = 0;

    const apply = () => {
      raf = 0;
      const r = parent.getBoundingClientRect();
      el.style.setProperty("--cg-x", `${x - r.left}px`);
      el.style.setProperty("--cg-y", `${y - r.top}px`);
    };
    const onMove = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      el.style.opacity = "1";
      if (!raf) raf = requestAnimationFrame(apply);
    };
    const onLeave = () => {
      el.style.opacity = "0";
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("mouseleave", onLeave);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return <div ref={ref} className="cursor-grid" aria-hidden="true" />;
}
