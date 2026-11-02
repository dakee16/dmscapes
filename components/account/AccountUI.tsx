"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { startCheckout } from "@/lib/checkout";
import { RECHARGE_CREDITS, RECHARGE_PRICE_USD } from "@/lib/plan";
import c from "./AccountPage.module.css";

export const usd = (n: number) => `$${n.toFixed(2)}`;

export function fmtDate(iso: string, opts: Intl.DateTimeFormatOptions): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, opts);
  } catch {
    return "";
  }
}

/** Map the stored auth provider to a display name, or null for email/password. */
export function oauthLabel(provider: string | null | undefined): string | null {
  switch ((provider ?? "").toLowerCase()) {
    case "google":
      return "Google";
    case "azure":
    case "microsoft":
      return "Microsoft";
    default:
      return null;
  }
}

/** Plus: buy a recharge pack through Stripe checkout (the browser leaves for Stripe). */
export function RechargeButton() {
  const { openAuthModal } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function recharge() {
    if (busy) return;
    setBusy(true);
    setError("");
    const res = await startCheckout("recharge");
    if (res.ok) return; // browser navigates to Stripe
    setBusy(false);
    if (res.needsAuth) {
      openAuthModal("profile");
      return;
    }
    setError(res.error);
  }
  return (
    <>
      <button type="button" onClick={recharge} disabled={busy} className={`${c.btn} ${c.ink}`}>
        {busy ? "Starting checkout…" : `Recharge · ${RECHARGE_CREDITS} credits for ${usd(RECHARGE_PRICE_USD)}`}
      </button>
      {error && <p role="alert">{error}</p>}
    </>
  );
}
