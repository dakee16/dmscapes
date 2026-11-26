"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check } from "@/components/ds/Icons";
import { useAuth } from "@/lib/auth-context";
import { track } from "@/lib/analytics";
import { bearer } from "@/lib/invites";
import { formatGiftCode, normalizeGiftCode, type GiftPlan } from "@/lib/gift";
import css from "./Gift.module.css";

// The code from the gift email's link (#gift=…), kept for the trip to sign in and back, in this tab only.
const CODE_KEY = "dormscape-gift-code";

/** Type or paste a gift code, sign in or up, and the plan is yours (app/api/gift/redeem). */
export default function RedeemForm() {
  const { user, loading, openAuthModal, refreshProfile } = useAuth();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ plan: GiftPlan; credits: number } | null>(null);

  // Read the code from the link, then take it out of the address bar (and so out of history and screenshots).
  useEffect(() => {
    const fromLink = /(?:^#|&)gift=([0-9A-Za-z-]{16,24})/.exec(window.location.hash)?.[1];
    try {
      if (fromLink) window.sessionStorage.setItem(CODE_KEY, fromLink);
      const saved = fromLink ?? window.sessionStorage.getItem(CODE_KEY);
      if (saved) setCode(saved.toUpperCase());
    } catch {
      if (fromLink) setCode(fromLink.toUpperCase());
    }
    if (window.location.hash) window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!normalizeGiftCode(code)) {
      setError("That code doesn't look right. It's 16 letters and numbers, like ABCD-EFGH-JKMN-PQRS.");
      return;
    }
    try {
      window.sessionStorage.setItem(CODE_KEY, code);
    } catch {
      // Storage blocked: they'll paste it again after signing in.
    }
    if (!user) {
      openAuthModal("profile");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const token = await bearer();
      const res = await fetch("/api/gift/redeem", {
        method: "POST",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => null)) as { plan?: GiftPlan; credits?: number; error?: string } | null;
      if (res.ok && data?.plan && data.credits) {
        try {
          window.sessionStorage.removeItem(CODE_KEY);
        } catch {
          // Storage blocked: nothing was kept.
        }
        setDone({ plan: data.plan, credits: data.credits });
        track("gift_redeemed", { plan: data.plan });
        void refreshProfile();
        return;
      }
      if (res.status === 401) {
        openAuthModal("profile");
        return;
      }
      setError(data?.error ?? "Couldn't redeem your gift right now. Try again in a minute.");
      track("gift_redeem_failed", { status: res.status });
    } catch {
      setError("Couldn't reach dormscape. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const name = done.plan === "pro" ? "Pro" : "Plus";
    return (
      <div className={`${css.card} ${css.done}`} role="status">
        <span className={css.doneCheck} aria-hidden="true">
          <Check size={30} strokeWidth={3} />
        </span>
        <h2 className={css.doneTitle}>{name} is yours.</h2>
        <p className={css.doneText}>
          We added {done.credits} plan credits and every {name} tool to your account. They don&rsquo;t expire.
        </p>
        <div className={css.doneActions}>
          <Link href="/plan" className="ds-btn ds-btn--blue">
            Plan a room
          </Link>
          <Link href="/account/billing" className="ds-btn ds-btn--ghost-ink">
            See your plan
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={css.card} aria-label="Redeem a gift" noValidate>
      <div className={css.field}>
        <label className={css.label} htmlFor="gift-code">
          Gift code
        </label>
        <input
          id="gift-code"
          className={`${css.input} ${css.code}`}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
          onBlur={() => {
            const clean = normalizeGiftCode(code);
            if (clean) setCode(formatGiftCode(clean));
          }}
          placeholder="ABCD-EFGH-JKMN-PQRS"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          maxLength={24}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "gift-code-error" : undefined}
        />
      </div>
      {error && (
        <p id="gift-code-error" className={css.error} role="alert">
          {error}
        </p>
      )}
      <button type="submit" className={`ds-btn ds-btn--blue ${css.submit}`} disabled={busy || loading}>
        {busy ? "Unwrapping…" : user || loading ? "Redeem gift" : "Sign up or log in to redeem"}
      </button>
      <p className={css.fine}>A free account is all it takes. Gift codes never expire and work once.</p>
    </form>
  );
}
