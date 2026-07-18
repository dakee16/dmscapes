"use client";

import { Children, useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

// Ease-out-expo. Every reveal on the site shares this curve; nothing bouncy.
export const REVEAL_EASE = [0.16, 1, 0.3, 1] as const;

const HIDDEN = { opacity: 0, y: 18, transition: { duration: 0 } };

/**
 * Scroll-reveal wrapper (framer-motion). Server markup renders children fully
 * visible (no-JS safe); on mount, wrappers still below the fold arm (snap to
 * hidden) and rise in when they intersect. Elements already on screen never
 * flash. Arms only when prefers-reduced-motion is off.
 */
export default function Reveal({
  children,
  className,
  delay = 0,
  stagger = false,
  itemClassName,
}: {
  children: React.ReactNode;
  className?: string;
  /** ms before the animation starts once visible */
  delay?: number;
  /** animate direct children one-by-one instead of the wrapper */
  stagger?: boolean;
  /** classes for the per-child wrappers in stagger mode; they become the layout children */
  itemClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const inView = useInView(ref, {
    once: true,
    amount: 0.12,
    margin: "0px 0px -6% 0px",
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setArmed(true);
  }, []);

  const state = armed && !inView ? "hidden" : "shown";

  const container = stagger
    ? {
        hidden: {},
        shown: {
          transition: { staggerChildren: 0.09, delayChildren: delay / 1000 },
        },
      }
    : {
        hidden: HIDDEN,
        shown: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.55, ease: REVEAL_EASE, delay: delay / 1000 },
        },
      };

  const item = {
    hidden: HIDDEN,
    shown: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: REVEAL_EASE },
    },
  };

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={false}
      animate={state}
      variants={container}
    >
      {stagger
        ? Children.map(children, (child) => (
            <motion.div className={itemClassName} variants={item}>
              {child}
            </motion.div>
          ))
        : children}
    </motion.div>
  );
}
