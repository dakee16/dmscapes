"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useExperienceMotion } from "./MotionProvider";

export default function BlueprintArtwork({
  variant = "plan",
}: {
  variant?: "plan" | "orbit";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { paused } = useExperienceMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const rotation = useTransform(scrollYProgress, [0, 1], [-12, 12]);
  const lift = useTransform(scrollYProgress, [0, 1], [25, -35]);
  return (
    <div
      ref={ref}
      className={`dm-blueprint-art dm-blueprint-${variant}`}
      aria-hidden="true"
    >
      <span className="dm-eyebrow dm-art-caption">
        Measure. Imagine. Make room.
      </span>
      <motion.div
        className="dm-art-scene"
        style={{ rotate: paused ? -5 : rotation, y: paused ? 0 : lift }}
      >
        {variant === "orbit" ? (
          <>
            <div className="dm-orbit-ring" />
            <div className="dm-orbit-ring dm-orbit-ring-two" />
            <span className="dm-orbit-star">✳</span>
            <span className="dm-orbit-sticker">
              A little room.
              <br />
              Infinite possibility.
            </span>
          </>
        ) : (
          <>
            <div className="dm-blueprint-sheet dm-blueprint-sheet-back" />
            <div className="dm-blueprint-sheet dm-blueprint-sheet-front">
              <svg viewBox="0 0 320 240" fill="none">
                <path
                  className="dm-drawn-line"
                  d="M30 210V25H285V135H225V210H30Z"
                  stroke="currentColor"
                  strokeWidth="3"
                  pathLength="1"
                />
                <path
                  d="M225 135H285M30 166H78V210"
                  stroke="#ffd84d"
                  strokeWidth="5"
                />
                <path
                  d="M30 14H285M15 25V210"
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="3 5"
                  opacity=".45"
                />
                <rect
                  x="47"
                  y="43"
                  width="65"
                  height="108"
                  rx="3"
                  stroke="currentColor"
                  fill="#2b4eff14"
                />
                <rect
                  x="54"
                  y="50"
                  width="51"
                  height="24"
                  rx="4"
                  fill="#2b4eff"
                />
                <path d="M47 85H112" stroke="currentColor" />
                <rect
                  x="163"
                  y="42"
                  width="101"
                  height="38"
                  rx="2"
                  stroke="currentColor"
                />
                <rect
                  x="190"
                  y="50"
                  width="42"
                  height="23"
                  rx="2"
                  stroke="currentColor"
                />
                <circle cx="209" cy="100" r="12" stroke="currentColor" />
                <ellipse
                  cx="150"
                  cy="153"
                  rx="39"
                  ry="32"
                  stroke="currentColor"
                  strokeDasharray="3 3"
                />
                <circle cx="202" cy="188" r="9" fill="#ffd84d" />
                <path
                  d="M30 25H50M30 25V45M285 25H265M285 25V45M30 210V190M30 210H50"
                  stroke="currentColor"
                  strokeWidth="5"
                />
              </svg>
              <span className="dm-eyebrow">Your room / Your rules</span>
            </div>
            <span className="dm-art-sticker">
              Planned
              <br />
              <em>to the inch.</em>
            </span>
          </>
        )}
      </motion.div>
    </div>
  );
}
