"use client";

import { dollars } from "@/components/studio-ui/list";
import s from "./ShoppingList.module.css";

/**
 * The budget meter pinned above the list: the total in big type, what's left
 * (or how far over), and a meter. `ink` is the dark card in the 3D studio.
 */
export default function BudgetTracker({
  total,
  budget,
  pieces,
  tone = "paper",
  size = "lg",
}: {
  total: number;
  budget: number;
  /** When set, "· N pieces" follows the budget (phone sheet). */
  pieces?: number;
  tone?: "paper" | "ink";
  size?: "lg" | "md" | "sm";
}) {
  const pct = budget > 0 ? (total / budget) * 100 : 0;
  const over = total > budget;
  const left = Math.abs(budget - total);
  return (
    <div className={s.meterBlock} data-tone={tone} data-size={size} data-over={over || undefined}>
      <p className={s.meterFigures}>
        <span className={s.meterTotal}>{dollars(total)}</span>
        <span className={s.meterOf}>
          of {dollars(budget)}
          {pieces !== undefined && ` · ${pieces} ${pieces === 1 ? "piece" : "pieces"}`}
        </span>
        <span className={s.meterLeft} role="status" aria-live="polite">
          {over ? `${dollars(left)} over` : `${dollars(left)} to spare`}
        </span>
      </p>
      <div
        className={s.meter}
        role="meter"
        aria-label="Budget used"
        aria-valuenow={Math.round(total)}
        aria-valuemin={0}
        aria-valuemax={Math.round(budget)}
        aria-valuetext={`${dollars(total)} of ${dollars(budget)}${over ? `, ${dollars(left)} over` : ""}`}
      >
        <span style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    </div>
  );
}
