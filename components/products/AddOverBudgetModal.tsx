"use client";

import { useEffect } from "react";
import type { Product } from "@/lib/types";

/**
 * Shown when adding a piece from "Things to add" would push the cart past the
 * budget the user chose. Spells out the budget and the resulting new total, then
 * lets them confirm or back out. Adds that stay within budget never reach this.
 */
export default function AddOverBudgetModal({
  product,
  budget,
  newTotal,
  onConfirm,
  onCancel,
}: {
  product: Product;
  budget: number;
  newTotal: number;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const over = newTotal - budget;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="over-budget-title"
    >
      <div
        className="snap-in w-full max-w-md rounded-2xl border border-ink/10 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-amber">
          Over budget
        </p>
        <h2
          id="over-budget-title"
          className="mt-1 font-display text-lg font-bold leading-snug text-ink"
        >
          This piece takes you over your budget
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Adding{" "}
          <span className="font-semibold text-ink">{product.name}</span> (${product.price.toFixed(2)})
          pushes your total to{" "}
          <span className="font-mono font-semibold text-ink">${newTotal.toFixed(0)}</span>,{" "}
          <span className="font-semibold text-ink">${over.toFixed(0)} over</span> your{" "}
          <span className="font-mono font-semibold text-ink">${budget.toFixed(0)}</span>{" "}
          budget. You can still add it if you want to.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 cursor-pointer rounded-xl border border-ink/15 bg-white px-5 text-sm font-semibold text-ink transition-colors hover:border-ink/30"
          >
            No, take me back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 cursor-pointer rounded-xl bg-cobalt px-5 text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep"
          >
            Add it anyway
          </button>
        </div>
      </div>
    </div>
  );
}
