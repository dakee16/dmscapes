"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Scroll-linked depth cue for the hero room preview: as the hero scrolls away,
 * the preview trails the surrounding text by a few pixels. Desktop-only and
 * transform-only, flat under prefers-reduced-motion.
 *
 * The scroll hook lives in ParallaxInner, which is mounted ONLY on desktop
 * (hover + fine pointer). On mobile the wrapper renders a plain <div>, so
 * useScroll never subscribes there — no scroll-linked work on phones.
 */
function ParallaxInner({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, 28]);
  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}

export default function HeroParallax({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px) and (hover: hover) and (pointer: fine)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!desktop || reduce) {
    return <div className={className}>{children}</div>;
  }
  return <ParallaxInner className={className}>{children}</ParallaxInner>;
}
