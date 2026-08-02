// SERVER-ONLY. Reads STRIPE_SECRET_KEY, which must never reach the client
// bundle. Import only from route handlers (app/api/**).
import Stripe from "stripe";

let cached: Stripe | null | undefined;

/**
 * Singleton Stripe client, or null when STRIPE_SECRET_KEY isn't set (checkout
 * routes then respond 503 and the UI shows a "not set up yet" message).
 */
export function getStripe(): Stripe | null {
  if (cached !== undefined) return cached;
  const key = process.env.STRIPE_SECRET_KEY;
  cached = key ? new Stripe(key) : null;
  return cached;
}
