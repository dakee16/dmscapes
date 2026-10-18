"use client";

import { usd } from "./room-model";
import { budgetRange } from "@/lib/styles";
import css from "./Budget.module.css";

const ROOM = budgetRange(null);

/**
 * The budget slider drawn as a tape measure. A real range input sits over the
 * tape (keyboard, touch and screen readers use it); the red marker follows it.
 * The range and marks default to a room's ($200 to $1,500); a seasonal kit
 * passes its own (lib/styles budgetRange).
 */
export default function BudgetTape({
  id,
  value,
  onChange,
  step = ROOM.step,
  size = "lg",
  min: MIN = ROOM.min,
  max: MAX = ROOM.max,
  marks: MARKS = ROOM.marks,
}: {
  id: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  size?: "lg" | "sm";
  min?: number;
  max?: number;
  marks?: number[];
}) {
  const p = Math.min(1, Math.max(0, (value - MIN) / (MAX - MIN)));
  return (
    <div className={css.tape} data-size={size} data-few={MARKS.length <= 7 || undefined} style={{ "--p": p, "--major": Math.round((MAX - MIN) / (MARKS[1] - MARKS[0])) } as React.CSSProperties}>
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
