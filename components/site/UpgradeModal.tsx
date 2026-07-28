"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useUpgrade, type UpgradeReason } from "@/lib/upgrade-context";
import { track } from "@/lib/analytics";
import { PLUS_PRICE_USD } from "@/lib/plan";

// Headline + one-line hook per gating point. The value block below is shared.
const COPY: Record<UpgradeReason, { title: string; body: string }> = {
  "save-limit": {
    title: "That's your one free design",
    body: "Free keeps a single design on file. Plus lets you save every look you're torn between, and pick the winner later.",
  },
  pdf: {
    title: "Download it as a clean PDF",
    body: "PDF export is a Plus perk. Hand a tidy, printable shopping list to whoever's funding the mini fridge.",
  },
  compare: {
    title: "See two designs side by side",
    body: "The comparison view is a Plus perk. Line up two rooms and their totals before you commit to one.",
  },
  "school-request": {
    title: "Skip to the front of the line",
    body: "Plus school requests get processed first. Upgrade and we'll bump yours up the queue.",
  },
  generic: {
    title: "Do more with Dormscape Plus",
    body: "One small upgrade unlocks the four things people ask for most, for good.",
  },
};

const PERKS = [
  "Save unlimited designs",
  "Download your list as a PDF",
  "Compare two designs side by side",
  "Priority on add-my-school requests",
];

export default function UpgradeModal() {
  const { open, reason, closeUpgrade } = useUpgrade();
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    track("upgrade_prompt_shown", { reason });
    const t = setTimeout(() => ctaRef.current?.focus(), 60);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeUpgrade();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, reason, closeUpgrade]);

  if (!open) return null;
  const copy = COPY[reason];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) closeUpgrade();
      }}
    >
      <div className="snap-in w-full max-w-md rounded-t-2xl border border-ink/10 bg-paper p-6 shadow-2xl sm:rounded-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-highlight px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
            <span className="font-display text-sm font-extrabold leading-none">+</span>
            Dormscape Plus
          </span>
          <button
            type="button"
            onClick={closeUpgrade}
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

        <h2
          id="upgrade-modal-title"
          className="mt-4 font-display text-2xl font-extrabold tracking-tight"
        >
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{copy.body}</p>

        <ul className="mt-5 space-y-2.5">
          {PERKS.map((perk) => (
            <li key={perk} className="flex items-center gap-2.5 text-[15px] text-ink">
              <span
                className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-highlight text-ink"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="3">
                  <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              {perk}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex items-baseline gap-2">
          <span className="font-display text-3xl font-extrabold tracking-tight">
            ${PLUS_PRICE_USD.toFixed(2)}
          </span>
          <span className="text-sm text-ink-soft">one time, not a subscription</span>
        </div>

        <Link
          ref={ctaRef}
          href="/pricing"
          onClick={() => {
            track("upgrade_cta_clicked", { reason });
            closeUpgrade();
          }}
          className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-ink text-base font-semibold text-white transition-colors hover:bg-cobalt"
        >
          See what Plus unlocks
        </Link>
        <button
          type="button"
          onClick={closeUpgrade}
          className="mt-3 block w-full cursor-pointer text-center text-sm text-ink-soft transition-colors hover:text-ink"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
