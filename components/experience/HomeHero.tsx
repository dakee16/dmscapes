"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/site/BrandMark";
import { motion } from "framer-motion";
import RoomModel from "./RoomModel";
import PlanCta from "@/components/site/PlanCta";
import { useExperienceMotion } from "./MotionProvider";

export default function HomeHero({ collegeCount, layoutCount }: { collegeCount: number; layoutCount: number }) {
  const [vibe, setVibe] = useState("cozy");
  const { paused } = useExperienceMotion();
  return (
    <>
      <section className="dm-hero" aria-labelledby="hero-title">
        <div className="dm-hero-topline dm-eyebrow">
          <Link href="/plan/draw/3d">New: build your room in 3D · Pro ↗︎</Link>
          <span>
            Fall ’26 <span aria-hidden="true">✳︎</span>
          </span>
        </div>
        <div className="dm-hero-copy">
          <h1 id="hero-title">
            {["Your dorm,", "planned to", "the inch."].map((line, i) => (
              <span className="dm-title-mask" key={line}>
                <motion.span
                  initial={paused ? false : { y: "110%", rotate: 3 }}
                  animate={{ y: 0, rotate: 0 }}
                  transition={{
                    duration: 0.95,
                    delay: i * 0.12,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className={i === 2 ? "dm-serif" : ""}
                >
                  {line}
                </motion.span>
              </span>
            ))}
          </h1>
          <PlanCta className="dm-button dm-hero-cta" />
          <small>No account needed to explore.</small>
        </div>
        <div className="dm-hero-stage">
          <div className="dm-stage-grid" aria-hidden="true" />
          <RoomModel vibe={vibe} />
          <div className="dm-hero-caption">
            <span className="dm-room-interaction-hint">↔︎ Drag to explore</span>
          </div>
          <div className="dm-hero-vibes" aria-label="Preview a room style">
            {["minimalist", "cozy", "preppy"].map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={vibe === value}
                onClick={() => setVibe(value)}
              >
                {value}
              </button>
            ))}
            <a href="#vibes">
              All nine vibes <span aria-hidden="true">↗︎</span>
            </a>
          </div>
        </div>
        <div className="dm-hero-bottom">
          <div className="dm-social-proof">
            <BrandMark size={48}/>
            <p>
              <strong>{collegeCount}</strong> colleges
            </p>
          </div>
          <Link href="/plan/draw" className="dm-draw-note">
            Draw your own room
            <span aria-hidden="true">↗︎</span>
          </Link>
          <a className="dm-eyebrow dm-scroll-cue" href="#how-it-works">
            How it works <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
      <div className="dm-fact-strip">
        <div>
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1 ? true : undefined}>
              <span>{layoutCount.toLocaleString("en-US")} dorm layouts</span>
              <i>✳︎</i>
              <span>$200 to $1,500 budgets</span>
              <i>✳︎</i>
              <span>Live Amazon links</span>
              <i>✳︎</i>
              <span>Real, building-specific dimensions</span>
              <i>✳︎</i>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
