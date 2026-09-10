"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  MotionConfig,
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import { usePathname } from "next/navigation";

const MotionContext = createContext({ paused: false, toggle: () => {} });
export const useExperienceMotion = () => useContext(MotionContext);

export default function MotionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const reduced = useReducedMotion();
  const [choice, setChoice] = useState<boolean | null>(null);
  const pathname = usePathname();
  const paused = choice ?? !!reduced;
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 180, damping: 35 });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("dormscape-motion-paused");
      if (stored !== null) setChoice(stored === "true");
    } catch {
      /* Motion still works when storage is unavailable. */
    }
  }, []);

  // A cross-page hash can arrive before Next's streamed section exists. Honor
  // it once that section mounts, including a direct visit to a section URL.
  useEffect(() => {
    let observer: MutationObserver | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    function followHash() {
      observer?.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      let id: string;
      try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
      if (!id) return;
      function scrollIfReady() {
        const target = document.getElementById(id);
        // Streaming can temporarily park the section in a hidden container.
        if (!target || !target.getClientRects().length || !target.getBoundingClientRect().height) return false;
        observer?.disconnect();
        clearTimeout(timer);
        frame = requestAnimationFrame(() => target.scrollIntoView({ block: "start", behavior: "instant" }));
        return true;
      }
      if (!scrollIfReady()) {
        observer = new MutationObserver(scrollIfReady);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "style"] });
        timer = setTimeout(() => observer?.disconnect(), 10000);
      }
    }
    followHash();
    window.addEventListener("hashchange", followHash);
    return () => {
      observer?.disconnect();
      clearTimeout(timer);
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", followHash);
    };
  }, [pathname]);

  function toggle() {
    const next = !paused;
    setChoice(next);
    try {
      localStorage.setItem("dormscape-motion-paused", String(next));
    } catch {}
  }

  const page =
    pathname === "/"
      ? "home"
      : pathname.split("/").filter(Boolean).slice(0, 2).join("-");
  return (
    <MotionContext.Provider value={{ paused, toggle }}>
      <MotionConfig reducedMotion={paused ? "always" : "user"}>
        <div
          className="dm-app"
          data-page={page}
          data-motion={paused ? "paused" : "on"}
        >
          <a href="#page-content" className="dm-skip">
            Skip to content
          </a>
          <motion.div
            className="dm-progress"
            style={{ scaleX: paused ? scrollYProgress : progress }}
            aria-hidden="true"
          />
          {children}
        </div>
      </MotionConfig>
    </MotionContext.Provider>
  );
}

export function MotionToggle() {
  const { paused, toggle } = useExperienceMotion();
  return (
    <button
      type="button"
      className="dm-motion-toggle"
      onClick={toggle}
      aria-pressed={paused}
      aria-label={
        paused ? "Resume decorative motion" : "Pause decorative motion"
      }
      title={paused ? "Resume motion" : "Pause motion"}
    >
      <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>
      <span className="dm-motion-label">
        {paused ? "Motion off" : "Motion on"}
      </span>
    </button>
  );
}
