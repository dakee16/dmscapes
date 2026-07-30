"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import Reveal, { REVEAL_EASE } from "@/components/site/Reveal";

const STEPS = [
  {
    n: "1",
    title: "Pick your college",
    body: "We already have your room: dimensions, bed size, window, even which way the door swings. Pulled from official housing docs for 50+ schools.",
    mock: (
      <div className="rounded-lg border border-ink/12 bg-white p-3">
        <p className="font-mono text-[10px] uppercase tracking-wide text-ink-soft">Your school</p>
        <p className="mt-1 text-sm font-semibold text-ink">University of Michigan</p>
        <p className="mt-0.5 font-mono text-xs text-cobalt">
          Mosher-Jordan Hall · 15&apos;6&quot; × 12&apos;0&quot;
        </p>
      </div>
    ),
  },
  {
    n: "2",
    title: "Choose a vibe + budget",
    body: "Five styles, from Minimalist to Preppy. Set anywhere between $200 and $1,500. The plan never goes a dollar over.",
    mock: (
      <div className="rounded-lg border border-ink/12 bg-white p-3">
        <div className="flex flex-wrap gap-1">
          {["Cozy", "Gamer", "Preppy"].map((v, i) => (
            <span
              key={v}
              className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                i === 0 ? "bg-ink text-white" : "border border-ink/15 text-ink-soft"
              }`}
            >
              {v}
            </span>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <div className="relative h-1.5 flex-1 rounded-full bg-ink/10">
            <div className="absolute inset-y-0 left-0 w-[45%] rounded-full bg-cobalt" />
            <div className="absolute left-[45%] top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cobalt bg-white" />
          </div>
          <span className="font-mono text-xs font-semibold text-ink">$650</span>
        </div>
      </div>
    ),
  },
  {
    n: "3",
    title: "Get your room",
    body: "A 2D layout that fits your exact floor plan, plus a shoppable list with live Amazon links. Add to cart, done.",
    mock: (
      <div className="rounded-lg border border-ink/12 bg-white p-3">
        <div className="grid-paper relative h-16 rounded border border-ink/40 bg-white [background-size:14%_25%]">
          <div className="absolute left-[6%] top-[12%] h-[38%] w-[40%] rounded-sm border border-ink/25 bg-[#f2ddc8]" />
          <div className="absolute bottom-[12%] left-[6%] h-[28%] w-[26%] rounded-sm border border-ink/25 bg-[#eef0ef]" />
          <div className="absolute right-[8%] top-[14%] h-[26%] w-[24%] rounded-sm border border-ink/25 bg-[#eef0ef]" />
          <div className="absolute bottom-[14%] right-[26%] h-[42%] w-[22%] rounded-full border border-dashed border-ink/25 bg-[#ecd2b8]" />
        </div>
        <p className="mt-2 font-mono text-xs text-ink">
          14 items · $612 <span className="text-ink-soft">· everything fits</span>
        </p>
      </div>
    ),
  },
];

// The steps get their own choreography (badge scale-in, drawn rule) beyond
// what Reveal offers, so the grid drives framer variants directly. Same
// SSR-safe arming pattern as Reveal: visible until proven below the fold.
const grid = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.09 } },
};
const card = {
  hidden: { opacity: 0, y: 18, transition: { duration: 0 } },
  shown: {
    opacity: 1,
    y: 0,
    // delayChildren sequences the badge + rule just after their own card
    // starts moving, so each step reads as one considered unit.
    transition: { duration: 0.55, ease: REVEAL_EASE, delayChildren: 0.15, staggerChildren: 0.08 },
  },
};
const badge = {
  hidden: { opacity: 0, scale: 0.7, transition: { duration: 0 } },
  shown: { opacity: 1, scale: 1, transition: { duration: 0.45, ease: REVEAL_EASE } },
};
const rule = {
  hidden: { scaleX: 0, transition: { duration: 0 } },
  shown: { scaleX: 1, transition: { duration: 0.5, ease: REVEAL_EASE } },
};

export default function HowItWorks() {
  const gridRef = useRef<HTMLDivElement>(null);
  const [armed, setArmed] = useState(false);
  const inView = useInView(gridRef, {
    once: true,
    amount: 0.12,
    margin: "0px 0px -6% 0px",
  });

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight * 0.9) return;
    setArmed(true);
  }, []);

  const state = armed && !inView ? "hidden" : "shown";

  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <Reveal stagger>
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
          How it works
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
          From acceptance letter to move-in cart in three steps
        </h2>
      </Reveal>
      <motion.div
        ref={gridRef}
        initial={false}
        animate={state}
        variants={grid}
        className="mt-12 grid gap-10 sm:grid-cols-3 sm:gap-6 lg:gap-10"
      >
        {STEPS.map((step) => (
          <motion.div key={step.n} variants={card} className="flex flex-col">
            <div className="flex items-center gap-3">
              <motion.span
                variants={badge}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-ink font-mono text-sm font-semibold text-white"
              >
                {step.n}
              </motion.span>
              <h3 className="font-display text-lg font-bold">{step.title}</h3>
              <motion.span
                variants={rule}
                className="h-px min-w-4 flex-1 origin-left bg-ink/10"
                aria-hidden="true"
              />
            </div>
            <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{step.body}</p>
            <div className="mt-5">{step.mock}</div>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
