"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";

/**
 * Scroll-linked depth cue for the hero room preview: as the hero scrolls
 * away, the preview trails the surrounding text by a few pixels. Transform
 * only, and flat under prefers-reduced-motion.
 */
export default function HeroParallax({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, reduce ? 0 : 28]);

  return (
    <motion.div style={{ y }} className={className}>
      {children}
    </motion.div>
  );
}
