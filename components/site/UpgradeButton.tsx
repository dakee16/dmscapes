"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { isPlus } from "@/lib/plan";
import { startCheckout } from "@/lib/checkout";

/**
 * The Plus purchase CTA. Signed-out users are sent to sign in first; signed-in
 * free users go straight to Stripe Checkout. Plus members see a settled
 * "you're in" state instead of a button.
 */
export default function UpgradeButton({
  className = "",
  label = "Upgrade for $4.99",
}: {
  className?: string;
  label?: string;
}) {
  const { user, profile, loading, openAuthModal } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (!loading && isPlus(profile)) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-cobalt/30 bg-cobalt/5 px-6 py-3 text-center text-base font-semibold text-cobalt">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        You&apos;re on Plus
      </div>
    );
  }

  async function handle() {
    if (busy) return;
    if (!user) {
      openAuthModal("profile");
      return;
    }
    setBusy(true);
    setError("");
    const res = await startCheckout();
    if (res.ok) return; // browser navigates to Stripe
    setBusy(false);
    if (res.needsAuth) {
      openAuthModal("profile");
      return;
    }
    setError(res.error);
  }

  return (
    <div>
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className={`w-full cursor-pointer disabled:cursor-wait disabled:opacity-70 ${className}`}
      >
        {busy ? "Starting checkout…" : label}
      </button>
      {error && (
        <p className="mt-2 text-sm text-[#c2321e]" role="alert">
          {error}
        </p>
      )}
      {!user && (
        <p className="mt-2 text-center text-xs text-ink-soft">
          You&apos;ll sign in first, then check out.
        </p>
      )}
    </div>
  );
}
