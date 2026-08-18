"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUpgrade, type UpgradeReason } from "@/lib/upgrade-context";
import { useAuth } from "@/lib/auth-context";
import { startCheckout } from "@/lib/checkout";
import { track } from "@/lib/analytics";
import { PLUS_PRICE_USD, PRO_PRICE_USD, RECHARGE_PRICE_USD, RECHARGE_CREDITS } from "@/lib/plan";
import BuyCreditsForm from "@/components/site/BuyCreditsForm";

// Headline + one-line hook per gating point. The value block below is shared by
// every reason except the two Plus-recharge reasons (plan-credits, save-credits),
// which get their own recharge-vs-Pro layout.
const COPY: Record<UpgradeReason, { title: string; body: string }> = {
  "plan-credits": {
    title: "You're out of plan credits",
    body: "You've used your Plus plan credits. Recharge to keep designing new rooms, or go Pro for unlimited. Your saved designs, exports, and comparisons stay right where they are.",
  },
  "save-credits": {
    title: "You're out of save credits",
    body: "You've used your Plus save credits. Recharge to keep saving designs, or go Pro for unlimited. Everything you've already saved stays right where it is.",
  },
  "free-plan-limit": {
    title: "That's your free room plan",
    body: "Free includes one room plan. Upgrade to Plus for 5 more, or Pro for unlimited room plans, plus every vibe and premium tool. Saving your designs is always free.",
  },
  "flex-credits": {
    title: "You're out of credits",
    body: "Buy more à-la-carte credits to keep designing — $1.99 each, no subscription. Or go Pro for unlimited room plans and every premium feature.",
  },
  "free-save-limit": {
    title: "That's your free saved design",
    body: "Free includes one saved design. Upgrade to Plus for 5 saves (and 5 plan credits), or Pro for unlimited, plus every vibe and premium tool.",
  },
  pdf: {
    title: "Export your list as a PDF",
    body: "PDF export is a paid perk. Hand a clean, printable shopping list to whoever's funding the mini fridge.",
  },
  png: {
    title: "Save your room as an image",
    body: "PNG export is a paid perk. Download your layout to drop into a doc or the group chat.",
  },
  compare: {
    title: "See two designs side by side",
    body: "The comparison view is a paid perk. Line up two rooms and their totals before you commit to one.",
  },
  "school-request": {
    title: "Skip to the front of the line",
    body: "Priority school requests are a paid perk. Upgrade and we'll bump yours up the queue.",
  },
  style: {
    title: "That's a paid vibe",
    body: "Gamer, Team Spirit, Retro, and Pastel are paid vibes. Plus and Pro unlock all nine.",
  },
  generic: {
    title: "Do more with Dormscape Plus",
    body: "One small upgrade unlocks every vibe and every premium feature, for good.",
  },
};

const PERKS = [
  "5 plan credits (saving is always free)",
  "All 9 vibes unlocked",
  "PDF and PNG export",
  "Compare two designs side by side",
  "Priority on add-my-school requests",
];

function Badge() {
  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-highlight px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
      <span className="font-display text-sm font-extrabold leading-none">+</span>
      Dormscape Plus
    </span>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Close"
      className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-ink"
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
      </svg>
    </button>
  );
}

export default function UpgradeModal() {
  const { open, reason, closeUpgrade } = useUpgrade();
  const { openAuthModal } = useAuth();
  const ctaRef = useRef<HTMLAnchorElement>(null);
  const rechargeRef = useRef<HTMLButtonElement>(null);
  const [busy, setBusy] = useState<null | "recharge" | "pro">(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    track("upgrade_prompt_shown", { reason });
    setBusy(null);
    setError("");
    const recharge = reason === "plan-credits" || reason === "save-credits";
    const t = setTimeout(
      () => (recharge ? rechargeRef : ctaRef).current?.focus(),
      60
    );
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
  // Plus members who ran a counter dry get the recharge-vs-Pro layout; free-tier
  // limits (and feature gates) get the shared Plus/Pro value block; a Flex user
  // out of credits gets the à-la-carte buy form plus a Pro option.
  const isRecharge = reason === "plan-credits" || reason === "save-credits";
  const isFlexCredits = reason === "flex-credits";

  async function buy(type: "recharge" | "pro") {
    if (busy) return;
    setBusy(type);
    setError("");
    track("upgrade_cta_clicked", { reason, type });
    const res = await startCheckout(type);
    if (res.ok) return; // browser navigates to Stripe
    setBusy(null);
    if (res.needsAuth) {
      closeUpgrade();
      openAuthModal("profile");
      return;
    }
    setError(res.error);
  }

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
      <div className="snap-in w-full max-w-lg rounded-t-3xl border border-ink/10 bg-paper p-7 shadow-[0_40px_120px_-30px_rgba(23,23,43,0.55)] sm:rounded-3xl sm:p-9">
        <div className="flex items-start justify-between gap-4">
          <Badge />
          <CloseButton onClick={closeUpgrade} />
        </div>

        <h2
          id="upgrade-modal-title"
          className="mt-5 font-display text-[1.75rem] font-extrabold leading-[1.12] tracking-tight sm:text-3xl"
        >
          {copy.title}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-ink-soft sm:text-base">
          {copy.body}
        </p>

        {isFlexCredits ? (
          // Out of credits on Flex: buy more à-la-carte, or step up to Pro.
          <>
            <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-4">
              <BuyCreditsForm source="upgrade-modal" autoFocus onStarted={closeUpgrade} />
            </div>
            <button
              type="button"
              onClick={() => buy("pro")}
              disabled={busy !== null}
              className="mt-3 flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-ink/15 bg-white px-5 py-4 text-left text-ink transition-colors hover:border-cobalt disabled:cursor-wait disabled:opacity-70"
            >
              <span>
                <span className="block text-base font-semibold leading-snug">
                  {busy === "pro" ? "Starting checkout…" : "Go Pro, unlimited"}
                </span>
                <span className="mt-1 block text-sm leading-snug text-ink-soft">
                  Unlimited room plans, no counters, ever.
                </span>
              </span>
              <span className="shrink-0 font-mono text-base font-semibold">
                ${PRO_PRICE_USD.toFixed(2)}
              </span>
            </button>
            {error && (
              <p className="mt-3 text-sm text-[#c2321e]" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={closeUpgrade}
              className="mt-3 block w-full cursor-pointer text-center text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Not now
            </button>
          </>
        ) : isRecharge ? (
          // Out of a counter: a Plus member chooses between a recharge and Pro.
          <>
            <div className="mt-6 space-y-3">
              <button
                ref={rechargeRef}
                type="button"
                onClick={() => buy("recharge")}
                disabled={busy !== null}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-cobalt bg-cobalt px-5 py-4 text-left text-white transition-colors hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70"
              >
                <span>
                  <span className="block text-base font-semibold leading-snug">
                    {busy === "recharge"
                      ? "Starting checkout…"
                      : `Recharge ${RECHARGE_CREDITS} plan credits`}
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-white/85">
                    Five more rooms to design, added on.
                  </span>
                </span>
                <span className="shrink-0 font-mono text-base font-semibold">
                  ${RECHARGE_PRICE_USD.toFixed(2)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => buy("pro")}
                disabled={busy !== null}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-ink/15 bg-white px-5 py-4 text-left text-ink transition-colors hover:border-cobalt disabled:cursor-wait disabled:opacity-70"
              >
                <span>
                  <span className="block text-base font-semibold leading-snug">
                    {busy === "pro" ? "Starting checkout…" : "Go Pro, unlimited"}
                  </span>
                  <span className="mt-1 block text-sm leading-snug text-ink-soft">
                    Unlimited room plans, no counters, ever.
                  </span>
                </span>
                <span className="shrink-0 font-mono text-base font-semibold">
                  ${PRO_PRICE_USD.toFixed(2)}
                </span>
              </button>
            </div>
            {error && (
              <p className="mt-3 text-sm text-[#c2321e]" role="alert">
                {error}
              </p>
            )}
            <button
              type="button"
              onClick={closeUpgrade}
              className="mt-3 block w-full cursor-pointer text-center text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Not now
            </button>
          </>
        ) : (
          // Free-user gate: show the shared value block and point to Pricing,
          // where the Plus / Pro choice is laid out clearly.
          <>
            <ul className="mt-6 space-y-3">
              {PERKS.map((perk) => (
                <li key={perk} className="flex items-center gap-2.5 text-base text-ink">
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

            <div className="mt-7 flex items-baseline gap-2.5">
              <span className="font-display text-4xl font-extrabold tracking-tight">
                ${PLUS_PRICE_USD.toFixed(2)}
              </span>
              <span className="text-sm text-ink-soft">
                one time for Plus, or ${PRO_PRICE_USD.toFixed(2)} for Pro
              </span>
            </div>

            <Link
              ref={ctaRef}
              href="/pricing"
              onClick={() => {
                track("upgrade_cta_clicked", { reason });
                closeUpgrade();
              }}
              className="mt-6 flex h-13 w-full items-center justify-center rounded-2xl bg-ink text-base font-semibold text-white transition-colors hover:bg-cobalt"
            >
              Upgrade
            </Link>
            <button
              type="button"
              onClick={closeUpgrade}
              className="mt-3 block w-full cursor-pointer text-center text-sm text-ink-soft transition-colors hover:text-ink"
            >
              Maybe later
            </button>
          </>
        )}
      </div>
    </div>
  );
}
