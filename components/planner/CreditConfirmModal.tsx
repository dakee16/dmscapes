"use client";

import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { REVEAL_EASE } from "@/components/site/Reveal";
import type { HeaderCreditState } from "@/lib/plan";

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
  const { unlimited, designsLeft, plus } = credit;
  const noun = plus ? "design credit" : "free design credit";
  const body = unlimited
    ? "You're on Pro, with unlimited designs. Ready to see this room?"
    : `You have ${designsLeft} ${noun}${designsLeft === 1 ? "" : "s"}. Use ${
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
    <motion.div
      className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-[3px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-confirm-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: REVEAL_EASE }}
    >
      <motion.div
        className="relative my-auto w-full max-w-sm overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-[0_40px_120px_-30px_rgba(23,23,43,0.55)]"
        initial={panelHidden}
        animate={panelIn}
        exit={panelOut}
        transition={{ duration: 0.34, ease: REVEAL_EASE }}
      >
        <div className="pointer-events-none absolute inset-0 grid-paper opacity-[0.5]" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-14 -top-16 h-48 w-48 rounded-full bg-cobalt/10 blur-3xl" aria-hidden="true" />

        <div className="relative p-7 sm:p-8">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cobalt text-white shadow-sm">
            <span className="font-display text-xl font-extrabold leading-none">
              {unlimited ? "∞" : designsLeft}
            </span>
          </span>
          <h2
            id="credit-confirm-title"
            className="mt-5 font-display text-2xl font-extrabold leading-tight tracking-tight text-ink"
          >
            You&rsquo;re in.
          </h2>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{body}</p>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              type="button"
              onClick={onConfirm}
              className="h-12 w-full cursor-pointer rounded-xl bg-cobalt px-6 text-base font-semibold text-white transition-colors hover:bg-cobalt-deep"
            >
              Yes, continue
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="h-11 w-full cursor-pointer rounded-xl px-4 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              No, take me home
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
