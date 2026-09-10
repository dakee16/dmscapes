"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import RoomModel from "./RoomModel";
import PlanCta from "@/components/site/PlanCta";
import { useExperienceMotion } from "./MotionProvider";

export default function HomeHero() {
  const [vibe, setVibe] = useState("cozy");
  const { paused } = useExperienceMotion();
  return (
    <>
      <section className="dm-hero" aria-labelledby="hero-title">
        <div className="dm-hero-topline dm-eyebrow">
          <span>Free dorm room planner</span>
          <span>
            Fall ’26 <span aria-hidden="true">✳</span>
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
          <p>
            Find your exact dorm room, get a layout that actually fits it, tune
            the style and budget, and leave with a shoppable list.
          </p>
          <PlanCta className="dm-button dm-hero-cta" />
          <small>No account needed. Most rooms take under a minute.</small>
        </div>
        <div className="dm-hero-stage">
          <div className="dm-stage-grid" aria-hidden="true" />
          <div className="dm-eyebrow dm-room-coordinate">
            Your next chapter / A style study
          </div>
          <RoomModel vibe={vibe} />
          <span className="dm-fit-tag">
            <span aria-hidden="true">✓</span> Make yourself at home.
          </span>
          <div className="dm-hero-caption">
            <span>A little room. A lot of you.</span>
            <span className="dm-room-interaction-hint">↔ Drag to explore</span>
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
              All nine vibes <span aria-hidden="true">↗</span>
            </a>
          </div>
        </div>
        <div className="dm-hero-bottom">
          <div className="dm-social-proof">
            <span aria-hidden="true">
              D<span>S</span>
              <span>↗</span>
            </span>
            <p>
              <strong>500+</strong> rooms planned
              <br />
              <small>and counting.</small>
            </p>
          </div>
          <Link href="/plan/draw" className="dm-draw-note">
            Draw your own room <span className="dm-yellow-tag">New</span>
            <small>Sketch it yourself.</small>
            <span aria-hidden="true">↗</span>
          </Link>
          <a className="dm-eyebrow dm-scroll-cue" href="#how-it-works">
            Scroll to make room <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>
      <div className="dm-fact-strip">
        <div>
          {[0, 1].map((copy) => (
            <div key={copy} aria-hidden={copy === 1 ? true : undefined}>
              <span>1,600+ dorm layouts</span>
              <i>✳</i>
              <span>$200–$1,500 budgets</span>
              <i>✳</i>
              <span>Live Amazon links</span>
              <i>✳</i>
              <span>Real, building-specific dimensions</span>
              <i>✳</i>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
