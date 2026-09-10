"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import RoomModel from "./RoomModel";
import PlanCta from "@/components/site/PlanCta";
import Reveal from "@/components/site/Reveal";

export default function AssemblyStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 65%", "end 85%"],
  });
  const progress = useTransform(scrollYProgress, [0, 0.88], [0, 1]);
  return (
    <section id="how-it-works" className="dm-story dm-section">
      <Reveal className="dm-section-heading">
        <p className="dm-eyebrow">01 / How it works</p>
        <h2>
          From acceptance letter
          <br />
          to <em>move-in cart.</em>
        </h2>
        <p>Three steps between you and a room that actually works.</p>
      </Reveal>
      <div ref={ref} className="dm-story-grid">
        <div className="dm-story-sticky">
          <div className="dm-preview-top dm-eyebrow">
            <span>Your room, coming together</span>
            <span>01 / 03</span>
          </div>
          <RoomModel assembly progress={progress} />
          <div className="dm-preview-bottom">
            <span>Start with the right dimensions.</span>
            <span className="dm-assembly-progress">
              <motion.i style={{ scaleX: progress }} />
            </span>
          </div>
        </div>
        <div className="dm-story-steps">
          <Reveal className="dm-story-step">
            <span className="dm-step-number">01</span>
            <h3>
              Find your
              <br />
              <em>exact dorm.</em>
            </h3>
            <p>
              Pick your school, building, and room type. We already have the
              dimensions, so everything fits before you buy.
            </p>
            <div className="dm-demo-form">
              <span>
                University of Michigan <b>⌄</b>
              </span>
              <span>
                Mosher-Jordan Hall <b>⌄</b>
              </span>
              <strong>
                15′6″ × 12′0″ <small>ROOM DIMENSIONS</small>
              </strong>
            </div>
          </Reveal>
          <Reveal className="dm-story-step">
            <span className="dm-step-number">02</span>
            <h3>
              Make it
              <br />
              <em>feel like you.</em>
            </h3>
            <p>
              Choose your vibe and set a budget. We handle the bedding,
              lighting, storage, and decor.
            </p>
            <div className="dm-demo-styles">
              <span>Cozy</span>
              <span>Gamer</span>
              <span>Preppy</span>
            </div>
            <div className="dm-demo-budget">
              <span>Your budget</span>
              <strong>$650</strong>
              <div />
              <small>$200</small>
              <small>$1,500</small>
            </div>
          </Reveal>
          <Reveal className="dm-story-step">
            <span className="dm-step-number">03</span>
            <h3>
              Get your
              <br />
              <em>room.</em>
            </h3>
            <p>
              A 2D layout that fits your exact floor plan, plus a shoppable list
              with live Amazon links. Add to cart, done.
            </p>
            <div className="dm-demo-receipt">
              <span className="dm-eyebrow">Example room / All sorted</span>
              <div>
                <span>14 items</span>
                <strong>$612</strong>
              </div>
              <p>
                Everything fits <span>✓</span>
              </p>
            </div>
            <PlanCta className="dm-text-link" />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
