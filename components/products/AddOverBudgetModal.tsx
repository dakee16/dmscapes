"use client";

import Modal from "@/components/site/Modal";

import { useEffect } from "react";
import type { Product } from "@/lib/types";
import d from "./Dialog.module.css";

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
    <Modal
      className={d.layer}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="over-budget-title"
    >
      <div className={d.card} onClick={(e) => e.stopPropagation()}>
        <p className={d.eyebrow} data-tone="warn">Over budget</p>
        <h2 id="over-budget-title" className={d.title}>
          This piece takes you <em>over your budget.</em>
        </h2>
        <p className={d.body}>
          Adding <strong>{product.name}</strong> (${product.price.toFixed(2)}) pushes your total to{" "}
          <strong>${newTotal.toFixed(0)}</strong>, <strong>${over.toFixed(0)} over</strong> your{" "}
          <strong>${budget.toFixed(0)}</strong> budget. You can still add it if you want to.
        </p>
        <div className={d.figures}>
          <span>${newTotal.toFixed(0)} of ${budget.toFixed(0)}</span>
          <b>${over.toFixed(0)} over</b>
        </div>
        <div className={d.actions}>
          <button type="button" onClick={onCancel} className={d.secondary}>
            No, take me back
          </button>
          <button type="button" onClick={onConfirm} className={d.primary}>
            Add it anyway
          </button>
        </div>
      </div>
    </Modal>
  );
}
