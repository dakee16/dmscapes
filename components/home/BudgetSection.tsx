"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import Headline from "@/components/ds/Headline";
import { useScrub, span } from "@/components/ds/useScrub";
import css from "./Home.module.css";

const MIN = 200;
const MAX = 1500;
const SHOWCASE = 650;

/**
 * An illustrative list for the example row, in the order a plan fills a room
 * (sleep first, then storage and light, then the nice-to-haves). The example
 * takes items in order until the next one won't fit. At $650 it lands on the
 * design's example: 14 pieces, $612, $38 to spare.
 */
const EXAMPLE_ITEMS = [
  59, 32, 48, 24, 29, 36, 22, 18, 34, 79, 45, 21, 149, 16, // → $612 at 14 pieces
  42, 38, 89, 19, 64, 27, 55, 35, 99, 25, 72, 31, 44, 23, 110, 48, 39,
];

function examplePlan(budget: number) {
  let total = 0;
  let pieces = 0;
  for (const price of EXAMPLE_ITEMS) {
    if (total + price > budget) break;
    total += price;
    pieces += 1;
  }
  return { pieces, total, spare: budget - total };
}

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;

/**
 * 05 · Budget. The slider walks from $200 to $650 as the section scrolls in,
 * then it's yours: drag it and the example plan refits live.
 */
export default function BudgetSection() {
  const box = useRef<HTMLDivElement>(null);
  const touched = useRef(false);
  const [budget, setBudget] = useState(SHOWCASE);
  const plan = useMemo(() => examplePlan(budget), [budget]);

  useScrub(
    box,
    (p) => {
      if (touched.current) return;
      const v = MIN + Math.round((span(p, 0, 1) * (SHOWCASE - MIN)) / 10) * 10;
      setBudget((b) => (b === v ? b : v));
    },
    { from: [0, 0.95], to: [0.5, 0.5], smooth: 0.5, rest: 1 }
  );

  const fillPct = ((budget - MIN) / (MAX - MIN)) * 100;

  return (
    <section className={`${css.section} ${css.budget}`} aria-labelledby="budget-title">
      <div className={`${css.inner} ${css.budgetGrid}`}>
        <div className={css.budgetCopy}>
          <p className={`ds-eyebrow ${css.eyebrowGap}`} data-reveal="">
            For whoever&apos;s holding the card
          </p>
          <Headline
            id="budget-title"
            className={css.h2c}
            lines={[
              { text: "See the total", className: css.s },
              { text: "before anyone swipes.", serif: true, className: css.f },
            ]}
          />
          <p className={`ds-lede ${css.budgetLede}`} data-reveal="">
            Set a budget from $200 to $1,500. Dormscape fills your room with picks priced to fit it, each with a live
            Amazon link.
          </p>
          <div ref={box} className={css.slider} data-reveal="">
            <div className={css.sliderTop}>
              <label htmlFor="home-budget">YOUR BUDGET</label>
              <output htmlFor="home-budget" className={css.figure} aria-live="off">
                {usd(budget)}
              </output>
            </div>
            <input
              id="home-budget"
              className={css.range}
              type="range"
              min={MIN}
              max={MAX}
              step={10}
              value={budget}
              aria-valuetext={usd(budget)}
              style={{ "--fill": `${fillPct}%` } as React.CSSProperties}
              onPointerDown={() => (touched.current = true)}
              onKeyDown={() => (touched.current = true)}
              onChange={(e) => {
                touched.current = true;
                setBudget(Number(e.target.value));
              }}
            />
            <div className={css.rangeEnds} aria-hidden="true">
              <span>$200</span>
              <span>$1,500</span>
            </div>
            <div className={css.example} aria-live="polite">
              <span>Example plan · {plan.pieces} pieces</span>
              <span>
                <strong>{usd(plan.total)}</strong>
                <span className={css.spare}>{usd(plan.spare)} to spare</span>
              </span>
            </div>
          </div>
          <p className={css.budgetFoot} data-reveal="">
            Plus exports the whole list as a PDF for whoever&apos;s paying.
          </p>
        </div>
        <div className={css.budgetArt} data-reveal-img="">
          <Image
            src="/redesign/home-budget-balance-scale.jpg"
            alt="A brass balance scale with a miniature furnished dorm room on one pan and stacks of gold coins on the other."
            fill
            quality={75}
            sizes="(min-width: 1024px) 41vw, 100vw"
          />
        </div>
      </div>
    </section>
  );
}
