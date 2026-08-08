"use client";

import { useEffect, useState } from "react";
import { track } from "@/lib/analytics";
import { PRO_PRICE_USD } from "@/lib/plan";

// Brief, satisfying confirmation shown when a buyer returns from Stripe Checkout
// for Plus or Pro. Stripe redirects to /account?upgraded=plus|pro (see
// app/api/checkout/route.ts), so this reads that param, celebrates once, and
// strips it from the URL so a refresh won't replay it. Distinct from the
// affiliate PurchaseSurvey: this confirms the plan purchase itself, and is a
// read-only "you're all set", never a form.
type Tier = "plus" | "pro";

const COPY: Record<Tier, { title: string; blurb: string; perks: string[] }> = {
  plus: {
    title: "You're on Plus.",
    blurb: "Every vibe and every premium feature is unlocked, permanently.",
    perks: [
      "5 plan credits + 5 saves (recharge anytime)",
      "All 9 vibes unlocked",
      "PDF + PNG export and side-by-side compare",
      "Priority on your add-my-school requests",
    ],
  },
  pro: {
    title: "You're on Pro.",
    blurb: "Unlimited plans and saves, with everything unlocked for good.",
    perks: [
      "Unlimited plan credits and saves",
      "All 9 vibes unlocked",
      "PDF + PNG export and side-by-side compare",
      "Priority on your add-my-school requests",
    ],
  },
};

export default function PurchaseThankYou() {
  const [tier, setTier] = useState<Tier | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const upgraded = params.get("upgraded");
    if (upgraded !== "plus" && upgraded !== "pro") return;
    setTier(upgraded);
    track("purchase_thank_you_shown", { tier: upgraded });
    // Strip the param so a refresh or share doesn't replay the celebration.
    params.delete("upgraded");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : "")
    );
  }, []);

  useEffect(() => {
    if (!tier) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTier(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [tier]);

  if (!tier) return null;
  const copy = COPY[tier];

  function close() {
    track("purchase_thank_you_dismissed", { tier });
    setTier(null);
  }

  return (
    <div
      className="fixed inset-0 z-[65] flex items-center justify-center overflow-y-auto bg-ink/45 p-4 backdrop-blur-[3px] sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="thankyou-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="rise relative my-auto w-full max-w-md overflow-hidden rounded-3xl border border-ink/10 bg-paper shadow-[0_40px_120px_-30px_rgba(23,23,43,0.55)]">
        <div className="pointer-events-none absolute inset-0 grid-paper opacity-[0.5]" aria-hidden="true" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/70 via-paper/40 to-paper" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-highlight/40 blur-3xl" aria-hidden="true" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-cobalt/10 blur-3xl" aria-hidden="true" />

        <div className="relative p-7 sm:p-9">
          <div className="flex items-start justify-between gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-cobalt text-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <h2
            id="thankyou-title"
            className="mt-5 font-display text-3xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-[2.1rem]"
          >
            Thank you. <span className="hl">{copy.title}</span>
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">{copy.blurb}</p>

          <ul className="mt-6 space-y-2.5">
            {copy.perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2.5">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                <span className="text-sm leading-snug text-ink">{perk}</span>
              </li>
            ))}
          </ul>

          {tier === "plus" && (
            <p className="mt-5 text-[13px] leading-relaxed text-ink-soft">
              Want unlimited forever? Pro is ${PRO_PRICE_USD.toFixed(2)}, one time.
            </p>
          )}

          <button
            type="button"
            onClick={close}
            className="mt-7 h-12 w-full cursor-pointer rounded-xl bg-cobalt px-6 text-base font-semibold text-white transition-colors hover:bg-cobalt-deep"
          >
            Start designing
          </button>
        </div>
      </div>
    </div>
  );
}
