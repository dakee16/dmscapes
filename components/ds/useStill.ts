"use client";

import { useEffect, useState } from "react";
import { useExperienceMotion } from "@/components/experience/MotionProvider";

/**
 * True while decorative motion must stay put: the footer's Motion off toggle
 * or the system's reduced-motion setting (MOTION.md). Scroll scenes and loops
 * check it before they start and show their finished state instead. CSS loops
 * get the same behaviour from [data-anim] (app/ds.css).
 */
export function useStill() {
  const { paused } = useExperienceMotion();
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return paused || reduced;
}
