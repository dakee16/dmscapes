import { getBrowserClient } from "@/lib/supabase-browser";
import { track } from "@/lib/analytics";

export type CheckoutResult =
  | { ok: true }
  | { ok: false; needsAuth: true }
  | { ok: false; needsAuth?: false; alreadyPlus?: boolean; error: string };

/**
 * Kick off the Plus checkout: fetch a Stripe session from /api/checkout and
 * send the browser to Stripe's hosted page. Returns needsAuth when the caller
 * should open the auth modal first. On success the browser navigates away.
 */
export async function startCheckout(): Promise<CheckoutResult> {
  const supabase = getBrowserClient();
  const token = supabase
    ? (await supabase.auth.getSession()).data.session?.access_token
    : null;
  if (!token) return { ok: false, needsAuth: true };

  track("checkout_started");
  let res: Response;
  try {
    res = await fetch("/api/checkout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    return { ok: false, error: "Network hiccup. Try again in a moment." };
  }

  if (res.status === 401) return { ok: false, needsAuth: true };

  const data = (await res.json().catch(() => ({}))) as {
    url?: string;
    error?: string;
    alreadyPlus?: boolean;
  };

  if (res.status === 409 && data.alreadyPlus) {
    return { ok: false, alreadyPlus: true, error: "You're already on Plus." };
  }
  if (!res.ok || !data.url) {
    return { ok: false, error: data.error ?? "Couldn't start checkout. Try again." };
  }

  window.location.href = data.url;
  return { ok: true };
}
