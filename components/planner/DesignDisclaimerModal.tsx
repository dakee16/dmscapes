"use client";

import Modal from "@/components/site/Modal";
import dlg from "@/components/plan-steps/Dialogs.module.css";

import { useEffect } from "react";

/**
 * Heads-up shown the moment someone taps "Plan my room", before the room is
 * generated. Dormscape doesn't auto-save a design, so this makes sure they know
 * to save it once it's ready, or it's gone when they leave. Confirming runs the
 * real generate; backing out returns them to the budget step.
 */
export default function DesignDisclaimerModal({
  onConfirm,
  onCancel,
}: {
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

  return (
    <Modal
      className={dlg.layer}
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="design-disclaimer-title"
    >
      <div className={dlg.card} onClick={(e) => e.stopPropagation()}>
        <p className={dlg.eyebrow}>Before you go in</p>
        <h2 id="design-disclaimer-title" className={dlg.title}>
          Keep your room for later
        </h2>
        <p className={dlg.text}>
          A recovery draft is kept on this device when browser storage is available.
          When your room is ready, tap <strong>Save design</strong> to keep it in
          your account. Clearing browser data or replacing this draft can remove
          local changes. Device recovery is not a cloud backup.
        </p>

        <div className={dlg.actions}>
          <button type="button" onClick={onCancel} className={dlg.secondary}>
            Back
          </button>
          <button type="button" onClick={onConfirm} className={dlg.primary}>
            Plan my room
          </button>
        </div>
      </div>
    </Modal>
  );
}
