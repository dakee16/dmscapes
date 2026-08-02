"use client";

export default function BudgetTracker({ total, budget }: { total: number; budget: number }) {
  const pct = budget > 0 ? (total / budget) * 100 : 0;
  const over = total > budget;
  const warn = !over && pct >= 90;
  const barColor = over ? "bg-[#dc2626]" : warn ? "bg-highlight" : "bg-cobalt";

  return (
    <div className="rounded-xl border border-ink/10 bg-white p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-sm font-semibold text-ink">
          Total: ${total.toFixed(0)}{" "}
          <span className="font-normal text-ink-soft">/ ${budget.toFixed(0)} budget</span>
        </p>
        {over && (
          <p className="font-mono text-xs font-semibold text-[#dc2626]">
            +${(total - budget).toFixed(0)} over
          </p>
        )}
        {warn && (
          <p className="font-mono text-xs font-medium text-ink-soft">almost there</p>
        )}
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-ink/8"
        role="progressbar"
        aria-valuenow={Math.round(Math.min(pct, 100))}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Budget used"
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${barColor}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}
