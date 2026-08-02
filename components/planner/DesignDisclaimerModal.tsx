"use client";

import { useEffect } from "react";

/**
 * Heads-up shown the moment someone taps "Design my room", before the room is
 * generated. Dormscape doesn't auto-save a design, so this makes sure they know
 * to save it once it's ready, or it's gone when they leave. Confirming runs the
 * real generate; backing out returns them to the style and budget step.
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
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 backdrop-blur-[2px] sm:items-center"
      onClick={onCancel}
      role="dialog"
      aria-modal="true"
      aria-labelledby="design-disclaimer-title"
    >
      <div
        className="snap-in w-full max-w-md rounded-2xl border border-ink/10 bg-white p-5 shadow-xl sm:p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-amber">
          Before you go in
        </p>
        <h2
          id="design-disclaimer-title"
          className="mt-1 font-display text-lg font-bold leading-snug text-ink"
        >
          Save your room or you&rsquo;ll lose it
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          Dormscape doesn&rsquo;t save your design automatically. When your room is
          ready, tap{" "}
          <span className="font-semibold text-ink">Save design</span> to keep it in
          your account. If you leave or refresh without saving, the design is gone.
        </p>

        <div className="mt-5 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="h-11 cursor-pointer rounded-xl border border-ink/15 bg-white px-5 text-sm font-semibold text-ink transition-colors hover:border-ink/30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="h-11 cursor-pointer rounded-xl bg-cobalt px-5 text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep"
          >
            Design my room
          </button>
        </div>
      </div>
    </div>
  );
}
