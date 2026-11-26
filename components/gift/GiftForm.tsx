"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "@/components/ds/Icons";
import { useAuth } from "@/lib/auth-context";
import { startGiftCheckout } from "@/lib/checkout";
import { cleanGift, GIFT_MESSAGE_MAX, GIFT_NAME_MAX, type GiftPlan } from "@/lib/gift";
import { PLUS_INITIAL_CREDITS, PLUS_PRICE_USD, PRO_INITIAL_CREDITS, PRO_PRICE_USD } from "@/lib/plan";
import css from "./Gift.module.css";

// Regular prices, always: gifts aren't part of any sale (app/api/checkout prices them the same way).
const PLANS: { id: GiftPlan; name: string; price: number; perk: string }[] = [
  { id: "plus", name: "Plus", price: PLUS_PRICE_USD, perk: `${PLUS_INITIAL_CREDITS} plan credits, all 9 vibes, PDF and PNG export` },
  { id: "pro", name: "Pro", price: PRO_PRICE_USD, perk: `${PRO_INITIAL_CREDITS} plan credits, 3D Room Builder, every Plus tool` },
];
const usd = (n: number) => `$${n.toFixed(2)}`;
// What the buyer typed, kept for the trip to sign in and back (this tab only).
const DRAFT_KEY = "dormscape-gift-draft";

type Draft = { plan: GiftPlan; to: string; from: string; message: string };

/** Choose Plus or Pro, say who it's for, add a note, then pay on Stripe (signed in). */
export default function GiftForm() {
  const { user, loading, openAuthModal } = useAuth();
  const [draft, setDraft] = useState<Draft>({ plan: "plus", to: "", from: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<GiftPlan | null>(null);

  // Back from Stripe (?sent=plus|pro, or ?checkout=cancelled), or back from signing in with a draft.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const done = params.get("sent");
    try {
      if (done === "plus" || done === "pro") {
        setSent(done);
        window.sessionStorage.removeItem(DRAFT_KEY);
        return;
      }
      const saved = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY) ?? "null") as Draft | null;
      if (saved && (saved.plan === "plus" || saved.plan === "pro")) setDraft(saved);
    } catch {
      // Storage blocked: start fresh.
    }
    if (params.get("checkout") === "cancelled") setNote("Checkout was cancelled, so nothing was charged and no gift was sent.");
  }, []);

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError("");
  };

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const checked = cleanGift({ to: draft.to, from: draft.from, message: draft.message });
    if (!checked.ok) {
      setError(checked.error);
      return;
    }
    try {
      window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {
      // Storage blocked: they'll type it again after signing in.
    }
    if (!user) {
      openAuthModal("profile");
      return;
    }
    setBusy(true);
    setError("");
    const result = await startGiftCheckout(draft.plan, checked.gift);
    if (result.ok) return; // on the way to Stripe
    setBusy(false);
    if (result.needsAuth) openAuthModal("profile");
    else setError(result.error);
  }

  if (sent) {
    return (
      <div className={`${css.card} ${css.done}`} role="status">
        <span className={css.doneCheck} aria-hidden="true">
          <Check size={30} strokeWidth={3} />
        </span>
        <h2 className={css.doneTitle}>Your gift is on its way.</h2>
        <p className={css.doneText}>
          We&rsquo;re emailing {sent === "pro" ? "Pro" : "Plus"} to them now, with a code that never expires. Your receipt is in
          your inbox, and Billing shows when they redeem it.
        </p>
        <div className={css.doneActions}>
          <Link href="/account/billing" className="ds-btn ds-btn--ink">
            See it in Billing
          </Link>
          <Link href="/gift" className="ds-btn ds-btn--ghost-ink" onClick={() => setSent(null)}>
            Send another
          </Link>
        </div>
      </div>
    );
  }

  const plan = PLANS.find((p) => p.id === draft.plan)!;
  return (
    <form onSubmit={submit} className={css.card} aria-label="Send a gift" noValidate>
      <fieldset className={css.field}>
        <legend className={css.label}>Choose a plan</legend>
        <div className={css.plans}>
          {PLANS.map((p) => (
            <label key={p.id} className={css.plan}>
              <input type="radio" name="plan" value={p.id} checked={draft.plan === p.id} onChange={() => set({ plan: p.id })} />
              <span className={css.planBox}>
                <span className={css.planName}>
                  {p.name}
                  <span className={css.planPrice}>{usd(p.price)}</span>
                </span>
                <span className={css.planPerk}>{p.perk}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={css.field}>
        <label className={css.label} htmlFor="gift-to">
          Their email <span className={css.req}>*</span>
        </label>
        <input
          id="gift-to"
          type="email"
          className={css.input}
          value={draft.to}
          onChange={(e) => set({ to: e.target.value })}
          placeholder="friend@example.com"
          autoComplete="off"
          maxLength={254}
          required
          aria-invalid={Boolean(error) && !cleanGift({ to: draft.to }).ok}
        />
      </div>

      <div className={css.field}>
        <label className={css.label} htmlFor="gift-from">
          Your name <span className={css.hint}>(optional, shown in the email)</span>
        </label>
        <input
          id="gift-from"
          className={css.input}
          value={draft.from}
          onChange={(e) => set({ from: e.target.value })}
          placeholder='Leave blank to send it from "someone"'
          autoComplete="given-name"
          maxLength={GIFT_NAME_MAX}
        />
      </div>

      <div className={css.field}>
        <label className={css.label} htmlFor="gift-message">
          A note <span className={css.hint}>(optional)</span>
        </label>
        <textarea
          id="gift-message"
          className={css.input}
          value={draft.message}
          onChange={(e) => set({ message: e.target.value })}
          placeholder="Can't wait to see your room."
          maxLength={GIFT_MESSAGE_MAX}
          rows={4}
          aria-describedby="gift-message-count"
        />
        <span id="gift-message-count" className={css.count} data-full={draft.message.length >= GIFT_MESSAGE_MAX ? "" : undefined}>
          {draft.message.length}/{GIFT_MESSAGE_MAX}
        </span>
      </div>

      {note && !error && (
        <p className={css.note} role="status">
          {note}
        </p>
      )}
      {error && (
        <p className={css.error} role="alert">
          {error}
        </p>
      )}

      <button type="submit" className={`ds-btn ds-btn--blue ${css.submit}`} disabled={busy || loading}>
        {busy ? "Opening checkout…" : user || loading ? `Continue to payment · ${usd(plan.price)}` : "Sign in to send a gift"}
      </button>
      <p className={css.fine}>One-time payment, secured by Stripe. You get the receipt; they get the gift.</p>
    </form>
  );
}
