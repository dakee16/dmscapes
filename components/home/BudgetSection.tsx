"use client";

import { useRef, useState } from "react";
import { EXAMPLE_ITEMS, ROOM_BUDGET, SHOWCASE_BUDGET, examplePlan } from "@/lib/home-data";
import H2 from "./H2";
import css from "./Home.module.css";

const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
const STEPS = Array.from({ length: (ROOM_BUDGET.max - ROOM_BUDGET.min) / ROOM_BUDGET.step + 1 }, (_, i) => ROOM_BUDGET.min + i * ROOM_BUDGET.step);
const SEG = ["#2449ff", "#ff4fa8", "#f3c21a", "#16161d", "#5b7cff", "#c0186f"];

/**
 * 05 · Budget. Pick a budget on the wheel (Kokonut Wheel Picker, same range
 * and steps as the planner's budget step) and the example plan refits: the
 * ring is the total against the budget (Kokonut Apple Activity Ring), the
 * total rolls digit by digit (Vengeance Animated Number), and each pick is a
 * segment of the strip, with what's left hatched.
 */
export default function BudgetSection() {
  const [budget, setBudget] = useState(SHOWCASE_BUDGET);
  const drag = useRef<{ y: number; from: number } | null>(null);
  const plan = examplePlan(budget);
  const at = Math.max(0, STEPS.indexOf(budget));
  const step = ROOM_BUDGET.step;
  const set = (v: number) => setBudget(Math.min(ROOM_BUDGET.max, Math.max(ROOM_BUDGET.min, Math.round(v / step) * step)));

  return (
    <section id="budget" className={css.budget} data-bg="#f6d0d4" aria-labelledby="budget-title">
      <div className={`ds-wrap ${css.bdGrid}`}>
        <div className={css.bdCopy}>
          <p className="ds-eyebrow" data-rv="">
            For whoever&apos;s holding the card
          </p>
          <H2 id="budget-title" s="See the total" f="before anyone swipes." />
          <p className={`ds-lede ${css.lede}`} data-rv="">
            Set a budget from {usd(ROOM_BUDGET.min)} to {usd(ROOM_BUDGET.max)}. dormscape fills your room with picks priced
            to fit it, each with a live Amazon link.
          </p>
          <p className={css.bdFoot} data-rv="">
            Plus exports the whole list as a PDF for whoever&apos;s paying.
          </p>
        </div>
        <div className={css.console} data-rv="" style={{ "--fill": (plan.total / budget).toFixed(4) } as React.CSSProperties}>
          <div className={css.wheel}>
            <p className={css.whL} id="budget-label">
              YOUR BUDGET
            </p>
            <div
              className={css.drum}
              aria-hidden="true"
              onPointerDown={(e) => {
                drag.current = { y: e.clientY, from: budget };
                e.currentTarget.setPointerCapture(e.pointerId);
              }}
              onPointerMove={(e) => {
                if (drag.current) set(drag.current.from + Math.round((drag.current.y - e.clientY) / 38) * step);
              }}
              onPointerUp={() => (drag.current = null)}
              onPointerCancel={() => (drag.current = null)}
            >
              <span className={css.band} />
              {STEPS.map((v, j) => {
                const o = j - at, a = Math.abs(o);
                return (
                  <button
                    key={v}
                    type="button"
                    tabIndex={-1}
                    className={css.wv}
                    data-on={o === 0 || undefined}
                    style={{ transform: `translateY(${o * 38}px) rotateX(${-o * 19}deg)`, opacity: a > 3 ? 0 : 1 - a * 0.27, pointerEvents: a > 3 ? "none" : "auto" }}
                    onClick={() => set(v)}
                  >
                    {usd(v)}
                  </button>
                );
              })}
            </div>
            <div className={css.whBtns} role="group" aria-labelledby="budget-label">
              <button type="button" className={css.whB} aria-label={`Lower the budget by ${usd(step)}`} onClick={() => set(budget - step)} disabled={budget <= ROOM_BUDGET.min}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h14" />
                </svg>
              </button>
              <button type="button" className={css.whB} aria-label={`Raise the budget by ${usd(step)}`} onClick={() => set(budget + step)} disabled={budget >= ROOM_BUDGET.max}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true">
                  <path d="M5 12h14M12 5v14" />
                </svg>
              </button>
            </div>
            <p className="ds-sr" aria-live="polite">
              Budget {usd(budget)}. Example plan: {plan.pieces} pieces, {usd(plan.total)}, {usd(plan.spare)} to spare.
            </p>
          </div>
          <div className={css.ring}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle className={css.rgT} cx="60" cy="60" r="52" />
              <circle className={css.rgF} cx="60" cy="60" r="52" pathLength={1} />
              <circle className={css.rgS} cx="60" cy="60" r="42" pathLength={1} />
            </svg>
            <div className={css.rgC} aria-hidden="true">
              <span className={css.rgK}>PLAN TOTAL</span>
              <span className={css.num2}>
                {usd(plan.total)
                  .split("")
                  .map((ch, i) =>
                    /[0-9]/.test(ch) ? (
                      <span key={i} className={css.dc}>
                        <span style={{ transform: `translateY(${-Number(ch)}em)` }}>
                          {"0123456789".split("").map((d) => (
                            <b key={d}>{d}</b>
                          ))}
                        </span>
                      </span>
                    ) : (
                      <span key={i}>{ch}</span>
                    ),
                  )}
              </span>
              <span className={css.rgOf}>of {usd(budget)}</span>
            </div>
          </div>
          <div className={css.strip} aria-hidden="true">
            {EXAMPLE_ITEMS.slice(0, plan.pieces).map((w, i) => (
              <i key={i} style={{ flexGrow: w, background: SEG[i % SEG.length] }} />
            ))}
            <b style={{ flexGrow: plan.spare }} />
          </div>
          <p className={css.ex2}>
            <strong>{plan.pieces} pieces</strong>
            <span className={css.spare}>{usd(plan.spare)} to spare</span>
            <span className={css.note}>Example plan · live Amazon links</span>
          </p>
        </div>
      </div>
    </section>
  );
}
