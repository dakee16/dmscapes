import type { PlanTier } from "@/lib/auth-context";

/**
 * Three-tier plan model. Prices are all one-time (no subscriptions).
 *   Plus     $7.99  -> 5 plan credits + all vibes + all features (permanent)
 *   Recharge $4.99  -> +5 plan credits (Plus only, repeatable)
 *   Pro      $19.99 -> unlimited credits + all vibes + all features (permanent)
 */
export const PLUS_PRICE_USD = 7.99;
export const PLUS_PRICE_CENTS = 799;
export const PRO_PRICE_USD = 19.99;
export const PRO_PRICE_CENTS = 1999;
export const RECHARGE_PRICE_USD = 4.99;
export const RECHARGE_PRICE_CENTS = 499;

/** Credits granted by the initial Plus purchase and by each recharge. */
export const PLUS_INITIAL_CREDITS = 5;
export const RECHARGE_CREDITS = 5;

/** The three one-time purchases the checkout/webhook understand. */
export type PurchaseType = "plus" | "pro" | "recharge";
export const PURCHASE_TYPES: readonly PurchaseType[] = ["plus", "pro", "recharge"];

/** The subset of a profile the plan helpers read. Works for both the client
 *  Profile and a raw server-side row. */
interface PlanFields {
  plan?: PlanTier | string | null;
  plan_credits_remaining?: number | null;
  plus_features_unlocked?: boolean | null;
}

/** Normalize any stored plan value to a known tier (defaults to free). */
export function planOf(value: string | null | undefined): PlanTier {
  return value === "plus" ? "plus" : value === "pro" ? "pro" : "free";
}

/** Free tier (or logged out). */
export function isFree(p: PlanFields | null | undefined): boolean {
  return planOf(p?.plan) === "free";
}

/** Pro tier: unlimited credits, everything unlocked. */
export function isPro(p: PlanFields | null | undefined): boolean {
  return planOf(p?.plan) === "pro";
}

/** Plus tier specifically (credit-metered). */
export function isPlusTier(p: PlanFields | null | undefined): boolean {
  return planOf(p?.plan) === "plus";
}

/** Paid (Plus or Pro). Governs vibe/style access: all 9 vibes unlocked. */
export function isPaid(p: PlanFields | null | undefined): boolean {
  const t = planOf(p?.plan);
  return t === "plus" || t === "pro";
}

/**
 * Whether premium features (PDF export, PNG export, comparison view, priority
 * school requests) are unlocked. True for Pro, and for anyone who has ever
 * purchased Plus, even after their plan credits run out.
 */
export function hasFeatures(p: PlanFields | null | undefined): boolean {
  return planOf(p?.plan) === "pro" || p?.plus_features_unlocked === true;
}

/** Plus users are credit-metered; free and pro are not. */
export function isCreditMetered(p: PlanFields | null | undefined): boolean {
  return planOf(p?.plan) === "plus";
}

/**
 * Remaining plan credits for a Plus user, or null when the concept doesn't
 * apply (free and pro generate plans without limit).
 */
export function creditsRemaining(p: PlanFields | null | undefined): number | null {
  if (planOf(p?.plan) !== "plus") return null;
  return Math.max(0, p?.plan_credits_remaining ?? 0);
}

/**
 * Whether the user may generate a new room plan right now. Free and Pro always
 * can; a Plus user needs at least one credit. Logged-out users have no profile
 * and are treated as free.
 */
export function canGeneratePlan(p: PlanFields | null | undefined): boolean {
  if (planOf(p?.plan) !== "plus") return true;
  return (p?.plan_credits_remaining ?? 0) > 0;
}
