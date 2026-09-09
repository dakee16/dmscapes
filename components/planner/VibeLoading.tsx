"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import RoomModel from "@/components/experience/RoomModel";
import { MotionToggle, useExperienceMotion } from "@/components/experience/MotionProvider";
import { VIBE_LOADING_LINES } from "@/lib/custom-vibe";

const SEARCH_CATEGORIES = ["Bedding & textiles", "Lighting & decor", "Storage & essentials"];

/** Decorative product-search motion; completion still comes from the real request. */
export default function VibeLoading({
  description = "",
  budget,
  regenerating = false,
}: {
  description?: string;
  budget?: number;
  regenerating?: boolean;
}) {
  const { paused } = useExperienceMotion();
  const [line, setLine] = useState(0);
  const assembly = useMotionValue(0.08);

  useEffect(() => {
    if (paused) {
      assembly.set(1);
      return;
    }
    const playback = animate(assembly, [0.08, 0.38, 0.7, 1, 1, 0.08], {
      duration: 14,
      times: [0, 0.2, 0.45, 0.7, 0.88, 1],
      ease: "easeInOut",
      repeat: Infinity,
    });
    const timer = window.setInterval(() => setLine(value => (value + 1) % VIBE_LOADING_LINES.length), 3200);
    return () => {
      playback.stop();
      window.clearInterval(timer);
    };
  }, [paused, assembly]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  return (
    <div className="dm-vibe-loading" aria-label="Finding products for your custom vibe" aria-busy="true">
      <header className="dm-vibe-loading-header">
        <span className="dm-brand-type font-bold">dorm<span className="text-cobalt">scape</span></span>
        <div><span className="dm-eyebrow">Custom vibe / In progress</span><MotionToggle /></div>
      </header>

      <div className="dm-vibe-loading-layout">
        <div className="dm-vibe-loading-copy">
          <p className="dm-eyebrow">{regenerating ? "A fresh take on your vibe" : "From your words to your room"}</p>
          <h2>Finding your<br /><span className="dm-serif">kind of room.</span></h2>
          {description && (
            <div className="dm-vibe-loading-brief">
              <span className="dm-eyebrow">Your brief</span>
              <blockquote>{description}</blockquote>
            </div>
          )}
          {typeof budget === "number" && (
            <div className="dm-vibe-loading-budget"><span className="dm-eyebrow">Your budget</span><strong>${budget.toLocaleString("en-US")}</strong></div>
          )}
          <p className="dm-vibe-loading-status" role="status" aria-live="polite" aria-atomic="true">
            <span aria-hidden="true" />{VIBE_LOADING_LINES[line]}
          </p>
        </div>

        <div className="dm-vibe-search-scene" aria-hidden="true">
          <div className="dm-vibe-search-heading"><span className="dm-eyebrow">Product search</span><span className="dm-eyebrow">Style study</span></div>
          <RoomModel assembly progress={assembly} />
          <div className="dm-vibe-search-cards">
            {SEARCH_CATEGORIES.map((category, index) => (
              <motion.div
                key={category}
                className="dm-vibe-search-card"
                initial={false}
                animate={paused ? { y: 0, opacity: 1 } : { y: [12, 0, 0, -12], opacity: [0, 1, 1, 0] }}
                transition={paused ? { duration: 0 } : { duration: 5.4, delay: index * 0.45, repeat: Infinity, times: [0, 0.16, 0.82, 1], ease: "easeInOut" }}
              >
                <span className="dm-eyebrow">0{index + 1} / Matching</span>
                <strong>{category}</strong>
                <div className="dm-vibe-search-track"><motion.span initial={false} animate={paused ? { x: 0 } : { x: ["-110%", "310%"] }} transition={paused ? { duration: 0 } : { duration: 2.4, delay: index * 0.2, repeat: Infinity, ease: "linear" }} /></div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <footer className="dm-vibe-loading-footer">
        <span className="dm-eyebrow">Your room is coming together</span>
        <p>Matching products to your vibe can take a little longer than a preset.</p>
      </footer>
    </div>
  );
}
