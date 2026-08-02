"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import FeedbackForm from "@/components/products/FeedbackForm";
import { track } from "@/lib/analytics";

/**
 * Footer "Feedback" entry point: a link-styled button that opens the same
 * rating UI used on the confirmation page, but standalone, usable any time,
 * with no purchase or saved design required. Modal chrome mirrors the
 * post-purchase prompt (PurchaseSurvey) for a consistent feel.
 */
export default function FeedbackLink() {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const close = useCallback(() => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setOpen(false);
  }, []);

  function handleOpen() {
    setOpen(true);
    track("feedback_prompt_opened", { source: "footer" });
  }

  // Escape to close + lock background scroll while the modal is up.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, close]);

  useEffect(() => {
    return () => {
      if (closeTimer.current) window.clearTimeout(closeTimer.current);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="cursor-pointer text-left text-sm font-medium text-ink-soft transition-colors hover:text-ink"
      >
        Feedback
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="footer-feedback-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          <div className="snap-in relative w-full max-w-md overflow-hidden rounded-t-2xl border border-ink/10 bg-paper p-6 shadow-2xl sm:rounded-2xl sm:p-7">
            {/* Graph-paper wash across the top, the same grid the site is built on. */}
            <div
              aria-hidden
              className="grid-paper pointer-events-none absolute inset-x-0 top-0 h-1/2"
              style={{
                WebkitMaskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 48%, transparent 100%)",
                maskImage:
                  "linear-gradient(to bottom, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 48%, transparent 100%)",
              }}
            />
            <div className="relative z-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-cobalt">
                    Feedback
                  </p>
                  <h2
                    id="footer-feedback-title"
                    className="mt-1.5 font-display text-xl font-bold tracking-tight"
                  >
                    Tell us how it&apos;s <span className="hl">going</span>
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label="Close"
                  className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-ink"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-4">
                <FeedbackForm
                  source="footer"
                  headline=""
                  subhead="A star rating sends it. Words are welcome, never required."
                  autoFocus
                  onSubmitted={() => {
                    // Let the "Thanks for the feedback" state land, then close.
                    closeTimer.current = window.setTimeout(close, 1600);
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
