"use client";

import { Children, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import g from "./Growth.module.css";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The gallery's card grid. Cards rise in, staggered, as they scroll into view
 * (Vengeance UI Staggered Grid), and a soft highlight glides behind whichever card
 * the pointer or keyboard is on (Vengeance UI Highlight Grid), built on framer-motion.
 */
export default function GalleryGrid({ children, label }: { children: React.ReactNode; label?: string }) {
  const [active, setActive] = useState<number | null>(null);
  const reduce = useReducedMotion();
  return (
    <ul className={g.gallery} aria-label={label} onPointerLeave={() => setActive(null)} onBlur={() => setActive(null)}>
      {Children.toArray(children).map((child, i) => (
        <motion.li
          key={i}
          className={g.cell}
          onPointerEnter={() => setActive(i)}
          onFocus={() => setActive(i)}
          initial={reduce ? false : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.45, delay: (i % 6) * 0.06, ease: EASE }}
        >
          {active === i && (
            <motion.span
              layoutId="gallery-highlight"
              className={g.highlight}
              aria-hidden="true"
              transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 36 }}
            />
          )}
          {child}
        </motion.li>
      ))}
    </ul>
  );
}
