"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { PLUS_PRICE_USD, PRO_PRICE_USD } from "@/lib/plan";

// The once-per-session "welcome" upgrade moment, shown after a free user's first
// sign-in of the session (wired in lib/auth-context). Deliberately NOT the
// standard reason-aware UpgradeModal: this is a larger, editorial takeover with
// a textured, amber-accented backdrop and a real feature grid, meant to feel
// like a considered welcome rather than a paywall. Easy to dismiss; never nags
// again that session.

type Feature = { label: string; desc: string; icon: React.ReactNode };

const FEATURES: Feature[] = [
  {
    label: "5 plan credits",
    desc: "Design five rooms, recharge anytime for $4.99.",
    icon: (
      <path
        d="M6 4h12a1 1 0 0 1 1 1v14l-7-4-7 4V5a1 1 0 0 1 1-1z"
        strokeLinejoin="round"
      />
    ),
  },
  {
    label: "PDF and PNG export",
    desc: "Your shopping list or your layout, downloaded.",
    icon: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" strokeLinejoin="round" />
        <path d="M14 3v5h5" strokeLinejoin="round" />
      </>
    ),
  },
  {
    label: "Compare designs",
    desc: "Two rooms and their totals, side by side.",
    icon: (
      <>
        <rect x="4" y="5" width="7" height="14" rx="1.5" />
        <rect x="13" y="5" width="7" height="14" rx="1.5" />
      </>
    ),
  },
  {
    label: "Priority requests",
    desc: "Your add-my-school request jumps the line.",
    icon: <path d="M13 2 4.5 13H11l-1 9 8.5-11H12l1-9z" strokeLinejoin="round" />,
  },
  {
    label: "All 9 vibes",
    desc: "Gamer, Team Spirit, Retro, Pastel, and the five free.",
    icon: (
      <>
        <path d="M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 2.2-3.7 2.5 2.5 0 0 1 2.2-3.8H20A2 2 0 0 0 22 12 10 10 0 0 0 12 3z" strokeLinejoin="round" />
        <circle cx="7.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none" />
        <circle cx="16.5" cy="10.5" r="1.1" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

export default function PlusWelcome({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (!open) return;
    track("plus_welcome_shown");
    const t = setTimeout(() => ctaRef.current?.focus(), 80);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-[3px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plus-welcome-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="rise relative my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-[0_40px_120px_-30px_rgba(23,23,43,0.55)]">
        {/* Layered, textured backdrop: a weightier graph-paper grid, a soft
            top-down wash, and an amber (premium) plus cobalt (brand) glow. */}
        <div className="pointer-events-none absolute inset-0 grid-paper opacity-[0.55]" aria-hidden="true" />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-paper/40 to-paper"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-60 w-60 rounded-full bg-highlight/35 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -left-16 h-60 w-60 rounded-full bg-cobalt/10 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative p-7 sm:p-10">
          <div className="flex items-start justify-between gap-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber/40 bg-highlight/25 px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
              <span className="font-display text-sm font-extrabold leading-none text-cobalt">+</span>
              Dormscape Plus
            </span>
            <button
              type="button"
              onClick={() => {
                track("plus_welcome_dismissed");
                onClose();
              }}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <h2
            id="plus-welcome-title"
            className="mt-6 max-w-md font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-4xl"
          >
            One upgrade, <span className="hl">everything unlocked.</span>
          </h2>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
            You have the free planner already. Plus unlocks every vibe and every
            premium feature, and hands you five room-plan credits to design with.
          </p>

          <div className="mt-7 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <span
                  className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-amber/30 bg-highlight/25 text-ink"
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8">
                    {f.icon}
                  </svg>
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink">{f.label}</p>
                  <p className="mt-0.5 text-[13px] leading-snug text-ink-soft">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 flex items-baseline gap-2.5">
            <span className="font-display text-4xl font-extrabold tracking-tight text-ink">
              ${PLUS_PRICE_USD.toFixed(2)}
            </span>
            <span className="text-sm text-ink-soft">
              one time for Plus. Pro is ${PRO_PRICE_USD.toFixed(2)} for unlimited.
            </span>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              ref={ctaRef}
              href="/pricing"
              onClick={() => {
                track("plus_welcome_cta_clicked");
                onClose();
              }}
              className="flex h-12 flex-1 items-center justify-center rounded-xl bg-ink px-6 text-base font-semibold text-white transition-colors hover:bg-cobalt"
            >
              Unlock Plus
            </Link>
            <button
              type="button"
              onClick={() => {
                track("plus_welcome_dismissed");
                onClose();
              }}
              className="h-12 shrink-0 cursor-pointer rounded-xl px-4 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
