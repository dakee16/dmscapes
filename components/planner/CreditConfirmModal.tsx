"use client";

import Modal from "@/components/site/Modal";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { REVEAL_EASE } from "@/components/site/Reveal";
import type { HeaderCreditState } from "@/lib/plan";
import dlg from "@/components/plan-steps/Dialogs.module.css";

const MotionModal = motion.create(Modal);

/**
 * Shown only in the Step 3 "Design my room" login gate, right after a gated
 * visitor authenticates: instead of auto-generating, we ask them to spend a
 * design on this room. Yes generates; No discards their selections and sends
 * them home (handled by the caller). Not used for normal logins.
 *
 * The caller renders this inside <AnimatePresence> so the exit plays too; the
 * motion is purely presentational and never touches the button logic.
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

  const reduce = useReducedMotion();
  // Backdrop fades; panel rises + scales in, and reverses on exit with the same
  // curve so it reads as one continuous motion. Reduced motion: opacity only.
  const panelIn = reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 };
  const panelHidden = reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.96 };
  const panelOut = reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.97 };

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <MotionModal
      className={dlg.layer}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-confirm-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: REVEAL_EASE }}
    >
      <motion.div
        className={dlg.card}
        style={{ animation: "none" }}
        initial={panelHidden}
        animate={panelIn}
        exit={panelOut}
        transition={{ duration: 0.34, ease: REVEAL_EASE }}
      >
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
      </motion.div>
    </MotionModal>
  );
}
