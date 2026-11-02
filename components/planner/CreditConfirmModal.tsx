"use client";

import Modal from "@/components/site/Modal";

import { useEffect } from "react";
import type { HeaderCreditState } from "@/lib/plan";
import dlg from "@/components/plan-steps/Dialogs.module.css";

/**
 * Shown only in the Step 3 "Design my room" login gate, right after a gated
 * visitor authenticates: instead of auto-generating, we ask them to spend a
 * design on this room. Yes generates; No discards their selections and sends
 * them home (handled by the caller). Not used for normal logins.
 *
 * Plain Modal (CSS entrance, no exit animation): a framer exit that is still
 * running when a button navigates can strand the backdrop over the next page.
 */
export default function CreditConfirmModal({
  credit,
  onConfirm,
  onCancel,
}: {
  credit: HeaderCreditState;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const { designsLeft, tier } = credit;
  const noun = tier === "free" ? "free design credit" : "design credit";
  const body = `You have ${designsLeft} ${noun}${designsLeft === 1 ? "" : "s"}. Use ${
        designsLeft === 1 ? "it" : "one"
      } now to see this room?`;


  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <Modal
      className={dlg.layer}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-confirm-title"
    >
      <div className={dlg.card}>
        <span className={dlg.count} aria-hidden="true">
          {designsLeft}
        </span>
        <h2 id="credit-confirm-title" className={dlg.title} style={{ marginTop: 18 }}>
          You&rsquo;re in.
        </h2>
        <p className={dlg.text}>{body}</p>

        <div className={`${dlg.actions} ${dlg.stack}`}>
          <button type="button" onClick={onConfirm} className={dlg.primary}>
            Yes, continue
          </button>
          <button type="button" onClick={onCancel} className={dlg.quiet}>
            No, take me home
          </button>
        </div>
      </div>
    </Modal>
  );
}
