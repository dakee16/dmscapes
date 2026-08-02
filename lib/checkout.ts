import { getBrowserClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";
import type { PurchaseType } from "@/lib/plan";

export type CheckoutResult =
  | { ok: true }
  | { ok: false; needsAuth: true }
  | {
      ok: false;
      needsAuth?: false;
      alreadyOwned?: boolean;
      needsPlus?: boolean;
      error: string;
    };

/**
 * Kick off a one-time Stripe checkout for Plus, Pro, or a Plus credit recharge.
 * Fetches a session from /api/checkout and sends the browser to Stripe's hosted
 * page. Returns needsAuth when the caller should open the auth modal first. On
 * success the browser navigates away.
 */
export async function startCheckout(type: PurchaseType = "plus"): Promise<CheckoutResult> {
  const supabase = getBrowserClient();
  const token = supabase
    ? (await supabase.auth.getSession()).data.session?.access_token
    : null;
  if (!token) return { ok: false, needsAuth: true };

  track("checkout_started", { type });
  let res: Response;
  try {
    res = await fetch("/api/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type }),
    });
  } catch {
    return { ok: false, error: "Network hiccup. Try again in a moment." };
  }

  if (res.status === 401) return { ok: false, needsAuth: true };

  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
    alreadyOwned?: boolean;
    needsPlus?: boolean;
  };

  if (res.status === 409) {
    return {
      ok: false,
      alreadyOwned: data.alreadyOwned,
      needsPlus: data.needsPlus,
      error: data.error ?? "That upgrade isn't available on your account.",
    };
  }
  if (!res.ok || !data.url) {
    return { ok: false, error: data.error ?? "Couldn't start checkout. Try again." };
  }

  window.location.href = data.url;
  return { ok: true };
}
