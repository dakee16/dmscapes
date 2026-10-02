"use client";

import { usd } from "./room-model";
import css from "./Budget.module.css";

const MIN = 200;
const MAX = 1500;
const MARKS = [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1100, 1200, 1300, 1400];

/**
 * The budget slider drawn as a tape measure. A real range input sits over the
 * tape (keyboard, touch and screen readers use it); the red marker follows it.
 */
export default function BudgetTape({
  id,
  value,
  onChange,
  step = 50,
  size = "lg",
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  size?: "lg" | "sm";
}) {
  const p = Math.min(1, Math.max(0, (value - MIN) / (MAX - MIN)));
  return (
    <div className={css.tape} data-size={size} style={{ "--p": p } as React.CSSProperties}>
      <label htmlFor={id} className="ds-sr">
        Budget in dollars, from {usd(MIN)} to {usd(MAX)}
      </label>
      <input
        id={id}
        type="range"
        min={MIN}
        max={MAX}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-valuetext={usd(value)}
        className={css.range}
      />
      <div className={css.strip} aria-hidden="true">
        <span className={css.marks}>
          {MARKS.map((m) => (
            <span key={m} style={{ left: `${((m - MIN) / (MAX - MIN)) * 100}%` }}>
              {m.toLocaleString("en-US")}
            </span>
          ))}
        </span>
        <span className={css.ends}>
          <span>{usd(MIN)}</span>
          <span>{usd(MAX)}</span>
        </span>
      </div>
      <div className={css.marker} aria-hidden="true">
        <span className={css.flag}>{usd(value)}</span>
        <span className={css.markerLine} />
        <span className={css.markerDot} />
      </div>
    </div>
  );
}
