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
import { MinusIcon, PlusIcon } from "@/components/account-ui/parts";
import css from "@/components/account-ui/BuyCredits.module.css";

// The à-la-carte Flex-credit purchase control: a quantity stepper, a live
// price (quantity × $0.99), and a "Buy credits" button that opens Stripe
// Checkout. Shared by the header buy-popover, the Billing page, and the
// Upgrade modal's out-of-credits state, so the buy flow is identical everywhere.
//
// A Free buyer becomes Flex on their first purchase; Flex, Plus, and Pro buyers keep
// their tier and just top up the shared plan_credits_remaining pool (the note
// below adapts). Pro tools stay available even when the credit pool is empty.
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
    <div className={css.form}>
      <label htmlFor={`flex-qty-${source}`} className={css.label}>
        How many credits?
      </label>
      <div className={css.row}>
        <div className={css.stepper}>
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q - 1))}
            disabled={qty <= FLEX_MIN_QTY || busy}
            aria-label="Fewer credits"
            className={css.step}
          >
            <MinusIcon />
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
            className={css.qty}
          />
          <button
            type="button"
            onClick={() => setQty((q) => clamp(q + 1))}
            disabled={qty >= FLEX_MAX_QTY || busy}
            aria-label="More credits"
            className={css.step}
          >
            <PlusIcon />
          </button>
        </div>
        {/* Price: "N x $0.99" on top, the running total large below, right-aligned
            so the stepper and the number never crowd each other. */}
        <div className={css.price} aria-live="polite">
          <p className={css.each}>
            {qty} &times; ${FLEX_CREDIT_PRICE_USD.toFixed(2)}
          </p>
          <p className={css.total}>${total}</p>
        </div>
      </div>

      <button type="button" onClick={buy} disabled={busy} className={css.buy}>
        {busy ? "Starting checkout…" : `Buy ${qty} credit${qty === 1 ? "" : "s"}`}
      </button>

      <p className={css.note}>
        {tier === "free"
          ? "$0.99 each. Your first purchase moves you to the Flex tier: same free features, plus the credits you buy."
          : "$0.99 each, added to your existing credits. One-time payment, no subscription."}
      </p>

      {error && (
        <p className={css.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
