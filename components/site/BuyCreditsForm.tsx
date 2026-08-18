"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { startCheckout } from "@/lib/checkout";
import { track } from "@/lib/analytics";
import {
  FLEX_CREDIT_PRICE_USD,
  FLEX_MIN_QTY,
  FLEX_MAX_QTY,
  FLEX_DEFAULT_QTY,
  planOf,
} from "@/lib/plan";

// The à-la-carte Flex-credit purchase control: a quantity stepper, a live
// price (quantity × $1.99), and a "Buy credits" button that opens Stripe
// Checkout. Shared by the header buy-popover, the Billing page, and the
// Upgrade modal's out-of-credits state, so the buy flow is identical everywhere.
//
// A Free buyer becomes Flex on their first purchase; Flex and Plus buyers keep
// their tier and just top up the shared plan_credits_remaining pool (the note
// below adapts). Pro never sees this (checkout blocks it, callers hide it).
export default function BuyCreditsForm({
  source,
  autoFocus = false,
  onStarted,
}: {
  /** Analytics label for where the buy started (e.g. "header", "billing"). */
  source: string;
  autoFocus?: boolean;
  /** Called once the checkout redirect kicks off (e.g. to close a popover). */
  onStarted?: () => void;
}) {
  const { profile, openAuthModal } = useAuth();
  const [qty, setQty] = useState(FLEX_DEFAULT_QTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const tier = planOf(profile?.plan);
  const total = (qty * FLEX_CREDIT_PRICE_USD).toFixed(2);

  const clamp = (n: number) =>
    Math.min(FLEX_MAX_QTY, Math.max(FLEX_MIN_QTY, Math.floor(Number.isFinite(n) ? n : FLEX_MIN_QTY)));

  async function buy() {
    if (busy) return;
    setBusy(true);
    setError("");
    track("flex_credits_buy_clicked", { source, quantity: qty });
    const res = await startCheckout("flex_credits", qty);
    if (res.ok) {
      onStarted?.();
      return; // browser navigates to Stripe
    }
    setBusy(false);
    if (res.needsAuth) {
      onStarted?.();
      openAuthModal("buy");
      return;
    }
    setError(res.error);
  }

  return (
    <div>
      <label
        htmlFor={`flex-qty-${source}`}
        className="block font-mono text-[11px] font-semibold uppercase tracking-wide text-ink-soft"
      >
        How many credits?
      </label>
      <div className="mt-2 flex items-center gap-2">
        <div className="flex h-11 items-stretch overflow-hidden rounded-xl border border-ink/15 bg-white">
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q - 1))}
            disabled={qty <= FLEX_MIN_QTY || busy}
            aria-label="Fewer credits"
            className="grid w-10 cursor-pointer place-items-center text-lg font-semibold text-ink-soft transition-colors hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            &minus;
          </button>
          <input
            id={`flex-qty-${source}`}
            type="number"
            inputMode="numeric"
            min={FLEX_MIN_QTY}
            max={FLEX_MAX_QTY}
            value={qty}
            autoFocus={autoFocus}
            onChange={(e) => setQty(clamp(Number(e.target.value)))}
            className="focus-quiet w-14 border-x border-ink/10 bg-transparent text-center font-mono text-base font-semibold text-ink outline-none"
          />
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q + 1))}
            disabled={qty >= FLEX_MAX_QTY || busy}
            aria-label="More credits"
            className="grid w-10 cursor-pointer place-items-center text-lg font-semibold text-ink-soft transition-colors hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
          >
            +
          </button>
        </div>
        <p className="font-mono text-sm text-ink-soft">
          {qty} &times; ${FLEX_CREDIT_PRICE_USD.toFixed(2)} ={" "}
          <span className="font-semibold text-ink">${total}</span>
        </p>
      </div>

      <button
        type="button"
        onClick={buy}
        disabled={busy}
        className="mt-3 flex h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-cobalt px-6 text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70"
      >
        {busy ? "Starting checkout…" : `Buy ${qty} credit${qty === 1 ? "" : "s"} · $${total}`}
      </button>

      <p className="mt-2 text-[13px] leading-snug text-ink-soft">
        {tier === "free"
          ? "$1.99 each. Your first purchase moves you to the Flex tier — same free features, plus the credits you buy."
          : "$1.99 each, added to your existing credits. One-time payment, no subscription."}
      </p>

      {error && (
        <p className="mt-2 text-sm text-[#c2321e]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
