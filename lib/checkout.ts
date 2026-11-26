import { getBrowserClient } from "@/lib/supabase-browser";
import { checkoutAnalyticsIds, track } from "@/lib/analytics";
import type { PurchaseType } from "@/lib/plan";
import { isSale, SALE } from "@/lib/sale";
import type { GiftDetails, GiftPlan } from "@/lib/gift";

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
 * Kick off a one-time Stripe checkout for Plus, Pro, a Plus credit recharge, or
 * an à-la-carte Flex credit purchase. For "flex_credits", pass the quantity of
 * $1.99 credits to buy; the server prices it as quantity × $1.99. Fetches a
 * session from /api/checkout and sends the browser to Stripe's hosted page.
 * Returns needsAuth when the caller should open the auth modal first. On success
 * the browser navigates away.
 */
export async function startCheckout(
  type: PurchaseType = "plus",
  quantity?: number
): Promise<CheckoutResult> {
  const supabase = getBrowserClient();
  const token = supabase
    ? (await supabase.auth.getSession()).data.session?.access_token
    : null;
  if (!token) return { ok: false, needsAuth: true };

  // Tagged the way the server prices it: by the clock, not the ?sale= preview.
  const sale = (type === "plus" || type === "pro") && isSale() ? { sale: SALE.id } : {};
  track("checkout_started", { type, ...(quantity != null ? { quantity } : {}), ...sale });
  let res: Response;
  try {
    res = await fetch("/api/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...(quantity != null ? { quantity } : {}), analytics: checkoutAnalyticsIds() }),
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

/**
 * Buy Plus or Pro as a gift (app/gift): the server prices it at the regular price and pins the recipient
 * on the session. Same result shape as startCheckout; on success the browser goes to Stripe.
 */
export async function startGiftCheckout(plan: GiftPlan, gift: GiftDetails): Promise<CheckoutResult> {
  const supabase = getBrowserClient();
  const token = supabase ? (await supabase.auth.getSession()).data.session?.access_token : null;
  track("gift_checkout_started", { plan });
  let res: Response;
  try {
    res = await fetch("/api/checkout", {
      method: "POST",
      // Without a session the server answers 401 and the page asks the buyer to sign in.
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), "Content-Type": "application/json" },
      body: JSON.stringify({ type: `gift_${plan}`, gift, analytics: checkoutAnalyticsIds() }),
    });
  } catch {
    return { ok: false, error: "Network hiccup. Try again in a moment." };
  }
  if (res.status === 401) return { ok: false, needsAuth: true };
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) return { ok: false, error: data.error ?? "Couldn't start checkout. Try again." };
  window.location.href = data.url;
  return { ok: true };
}
