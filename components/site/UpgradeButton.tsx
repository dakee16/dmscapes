"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { isPro, isPlusTier } from "@/lib/plan";
import { startCheckout } from "@/lib/checkout";

function CheckSvg() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/**
 * Purchase CTA for Plus or Pro. Signed-out users sign in first; signed-in users
 * go straight to Stripe Checkout for the given tier. Members who already own the
 * tier (or a higher one) see a settled state instead of a button.
 */
export default function UpgradeButton({
  type = "plus",
  className = "",
  label,
}: {
  type?: "plus" | "pro";
  className?: string;
  label?: string;
}) {
  const { user, profile, loading, openAuthModal } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pro = isPro(profile);
  const plus = isPlusTier(profile);
  // Plus is "covered" by Plus or Pro; Pro only by Pro.
  const owned = !loading && (type === "pro" ? pro : plus || pro);

  if (owned) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-xl border border-cobalt/30 bg-cobalt/5 px-6 py-3 text-center text-base font-semibold text-cobalt">
        <CheckSvg />
        {type === "pro" ? "You're on Pro" : pro ? "Pro covers this" : "You're on Plus"}
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
    const res = await startCheckout(type);
    if (res.ok) return; // browser navigates to Stripe
    setBusy(false);
    if (res.needsAuth) {
      openAuthModal("profile");
      return;
    }
    setError(res.error);
  }

  const defaultLabel = type === "pro" ? "Go Pro for $19.99" : "Get Plus for $7.99";

  return (
    <div>
      <button
        type="button"
        onClick={handle}
        disabled={busy}
        className={`w-full cursor-pointer disabled:cursor-wait disabled:opacity-70 ${className}`}
      >
        {busy ? "Starting checkout…" : (label ?? defaultLabel)}
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
