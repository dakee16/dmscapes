"use client";

import { useEffect, useRef, useState } from "react";

// Scroll-reveal wrapper. Server markup renders children fully visible (no-JS
// safe); on mount, wrappers still below the fold get hidden and animate in
// when they intersect. Elements already on screen never flash.
export default function Reveal({
  children,
  className,
  delay = 0,
  stagger = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** ms before the animation starts once visible */
  delay?: number;
  /** animate direct children one-by-one instead of the wrapper */
  stagger?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<"ssr" | "waiting" | "in">("ssr");

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setPhase("waiting");
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setPhase("in");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const base = stagger ? "reveal-stagger" : "reveal";
  return (
    <div
      ref={ref}
      className={[className, phase === "ssr" ? "" : base, phase === "in" ? "is-in" : ""]
        .filter(Boolean)
        .join(" ")}
      style={delay ? ({ "--reveal-delay": `${delay}ms` } as React.CSSProperties) : undefined}
    >
      {children}
    </div>
  );
}
