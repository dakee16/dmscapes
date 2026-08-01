"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUpgrade, type UpgradeReason } from "@/lib/upgrade-context";
import { useAuth } from "@/lib/auth-context";
import { startCheckout } from "@/lib/checkout";
import { track } from "@/lib/analytics";
import { PLUS_PRICE_USD, PRO_PRICE_USD, RECHARGE_PRICE_USD, RECHARGE_CREDITS } from "@/lib/plan";

// Headline + one-line hook per gating point. The value block below is shared by
// every reason except "credits", which is a Plus member out of plan credits and
// gets its own recharge-vs-Pro layout.
const COPY: Record<UpgradeReason, { title: string; body: string }> = {
  credits: {
    title: "You're out of plan credits",
    body: "You've used your Plus plan credits. Add more to keep designing new rooms, or go Pro for unlimited. Your saved designs, exports, and comparisons stay right where they are.",
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
    const t = setTimeout(
      () => (reason === "credits" ? rechargeRef : ctaRef).current?.focus(),
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
  const isCredits = reason === "credits";

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
      <div className="snap-in w-full max-w-md rounded-t-2xl border border-ink/10 bg-paper p-6 shadow-2xl sm:rounded-2xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <Badge />
          <CloseButton onClick={closeUpgrade} />
        </div>

        <h2
          id="upgrade-modal-title"
          className="mt-4 font-display text-2xl font-extrabold tracking-tight"
        >
          {copy.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">{copy.body}</p>

        {isCredits ? (
          // Out-of-credits: a Plus member chooses between a recharge and Pro.
          <>
            <div className="mt-5 space-y-2.5">
              <button
                ref={rechargeRef}
                type="button"
                onClick={() => buy("recharge")}
                disabled={busy !== null}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-cobalt bg-cobalt px-4 py-3.5 text-left text-white transition-colors hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70"
              >
                <span>
                  <span className="block text-[15px] font-semibold leading-snug">
                    {busy === "recharge" ? "Starting checkout…" : `Recharge ${RECHARGE_CREDITS} credits`}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-white/80">
                    Keep your Plus perks, just top up.
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold">
                  ${RECHARGE_PRICE_USD.toFixed(2)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => buy("pro")}
                disabled={busy !== null}
                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-ink/15 bg-white px-4 py-3.5 text-left text-ink transition-colors hover:border-cobalt disabled:cursor-wait disabled:opacity-70"
              >
                <span>
                  <span className="block text-[15px] font-semibold leading-snug">
                    {busy === "pro" ? "Starting checkout…" : "Go Pro, unlimited plans"}
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-snug text-ink-soft">
                    Never think about credits again.
                  </span>
                </span>
                <span className="shrink-0 font-mono text-sm font-semibold">
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
              className="mt-5 flex h-12 w-full items-center justify-center rounded-xl bg-ink text-base font-semibold text-white transition-colors hover:bg-cobalt"
            >
              See plans
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
