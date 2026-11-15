"use client";

import Modal, { ModalClose } from "@/components/site/Modal";
import css from "./Feedback.module.css";

import { useCallback, useEffect, useRef, useState } from "react";
import FeedbackForm from "@/components/products/FeedbackForm";
import { track } from "@/lib/analytics";

/**
 * Footer "Feedback" entry point: a link-styled button that opens the same
 * rating UI used on the confirmation page, but standalone, usable any time,
 * with no purchase or saved design required. Chrome comes from the shared
 * dialog base (Modal): a paper card over the ink scrim.
 */
export default function FeedbackLink() {
  const [open, setOpen] = useState(false);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  function handleOpen() {
    setOpen(true);
    track("feedback_prompt_opened", { source: "footer" });
  }

  // No auto-open: the dialog opens only when someone clicks Feedback.

  return (
    <>
      <a
        href="/contact"
        onClick={(e) => { if (opensFeedback(e)) handleOpen(); }}
        className={css.trigger}
      >
        Feedback
      </a>

      {open && <FeedbackDialog onClose={close} />}
    </>
  );
}

/**
 * Feedback entries are real links to /contact (so they work without JavaScript and read as
 * links to crawlers); a plain click opens the feedback dialog instead. Modified clicks
 * (new tab, new window) keep the link.
 */
export function opensFeedback(e: React.MouseEvent): boolean {
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  e.preventDefault();
  return true;
}

export function FeedbackDialog({ onClose }: { onClose: () => void }) {
  const closeTimer = useRef<number | null>(null);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("keydown", escape); if (closeTimer.current) window.clearTimeout(closeTimer.current); };
  }, [onClose]);
  return (
    <Modal
      aria-labelledby="footer-feedback-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={css.card}>
        <div className={css.top}>
          <div>
            <p className={css.eyebrow}>Feedback</p>
            <h2 id="footer-feedback-title" className={css.title}>
              Tell us how it&apos;s <em>going.</em>
            </h2>
          </div>
          <ModalClose onClick={onClose} className={css.close} />
        </div>

        <div className={css.body}>
          <FeedbackForm
            source="footer"
            headline=""
            subhead="A star rating sends it. Words are welcome, never required."
            autoFocus
            onSubmitted={() => { closeTimer.current = window.setTimeout(onClose, 1600); }}
          />
        </div>
      </div>
    </Modal>
  );
}
