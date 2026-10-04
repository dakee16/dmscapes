"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";

const DISMISS_KEY = "dormscape-save-prompt-dismissed";

/**
 * Non-blocking save/sign-up nudge on the result page. Slides in 5s after the
 * room renders, only for signed-out users, dismissible once per session.
 */
export default function SavePrompt() {
  const { user, loading, openAuthModal } = useAuth();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (loading || user) return;
    if (window.sessionStorage.getItem(DISMISS_KEY)) return;
    const t = window.setTimeout(() => {
      setVisible(true);
      track("save_prompt_shown");
    }, 5000);
    return () => window.clearTimeout(t);
  }, [loading, user]);

  // Signed in while visible → nothing left to nudge about.
  useEffect(() => {
    if (user) setVisible(false);
  }, [user]);

  function dismiss() {
    setVisible(false);
    window.sessionStorage.setItem(DISMISS_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div
      role="complementary"
      aria-label="Save your design"
      className="ds rise fixed inset-x-4 bottom-[5rem] z-40 rounded-[18px] bg-[var(--ds-ink)] p-4 text-[#f4f2ec] shadow-[0_18px_40px_rgba(22,22,29,0.3)] sm:inset-x-auto sm:right-6 sm:w-80 lg:bottom-6"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="m-0 text-[19px] leading-tight">
          <span className="ds-display">Don&apos;t lose </span>
          <span className="ds-serif" style={{ color: "var(--ds-yellow)" }}>this room.</span>
        </p>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border-0 bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>
      <p className="mt-1 text-sm leading-relaxed text-[#c9c6d4]">
        Save your design free and pick up where you left off on any device.
      </p>
      <button
        type="button"
        onClick={() => {
          dismiss();
          openAuthModal("save-design");
        }}
        className="ds-btn ds-btn--yellow ds-btn--sm mt-3 w-full"
      >
        Save my design
      </button>
    </div>
  );
}
