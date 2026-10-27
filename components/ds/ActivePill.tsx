"use client";

import { motion } from "framer-motion";

/**
 * The selected background in a row of toggles or chips (Kokonut Swipe Tabs, via Motion's shared layout): one
 * pill that slides to whichever control is chosen. Render it inside the selected control only; that control
 * needs position: relative and isolation: isolate. Instant with reduced motion (MotionProvider).
 */
export default function ActivePill({ id, className = "" }: { id: string; className?: string }) {
  return (
    <motion.span
      layoutId={id}
      aria-hidden="true"
      className={`ds-active-pill ${className}`}
      transition={{ type: "spring", stiffness: 520, damping: 42, mass: 0.8 }}
    />
  );
}
