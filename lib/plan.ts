import type { PlanTier } from "@/lib/auth-context";

/**
 * Three-tier plan model with TWO independent counters (plans and saves). Prices
 * are all one-time (no subscriptions).
 *   Free     1 lifetime room plan + 1 lifetime saved design (independent caps)
 *   Plus     $7.99  -> 5 plan credits + 5 save credits (separate), all vibes,
 *                      all features permanently. Recharge $4.99 adds 5 to both.
 *   Pro      $19.99 -> unlimited plans + unlimited saves, all vibes/features.
 */
export const PLUS_PRICE_USD = 7.99;
export const PLUS_PRICE_CENTS = 799;
export const PRO_PRICE_USD = 19.99;
export const PRO_PRICE_CENTS = 1999;
export const RECHARGE_PRICE_USD = 4.99;
export const RECHARGE_PRICE_CENTS = 499;

/** Credits granted by the initial Plus purchase, per counter. */
export const PLUS_INITIAL_CREDITS = 5;
/** Credits added to BOTH counters by each recharge. */
export const RECHARGE_CREDITS = 5;
/** Free-tier lifetime caps, per counter. */
export const FREE_PLAN_CAP = 1;
export const FREE_SAVE_CAP = 1;

/** The three one-time purchases the checkout/webhook understand. */
export type PurchaseType = "plus" | "pro" | "recharge";
export const PURCHASE_TYPES: readonly PurchaseType[] = ["plus", "pro", "recharge"];

/** The subset of a profile the plan helpers read. Works for both the client
 *  Profile and a raw server-side row. */
interface PlanFields {
  plan?: PlanTier | string | null;
  plan_credits_remaining?: number | null;
  save_credits_remaining?: number | null;
  free_plans_used?: number | null;
  free_saves_used?: number | null;
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

/** Pro tier: unlimited plans and saves, everything unlocked. */
export function isPro(p: PlanFields | null | undefined): boolean {
  return planOf(p?.plan) === "pro";
}

/** Plus tier specifically (credit-metered on both counters). */
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
 * purchased Plus, even after either counter runs out.
 */
export function hasFeatures(p: PlanFields | null | undefined): boolean {
  return planOf(p?.plan) === "pro" || p?.plus_features_unlocked === true;
}

/**
 * Whether we show live credit counters for this account. Only Plus has finite,
 * moving counts worth displaying; free (a fixed 1+1) and pro (unlimited) don't.
 */
export function showCredits(p: PlanFields | null | undefined): boolean {
  return planOf(p?.plan) === "plus";
}

/** Remaining Plus plan credits, or null when the concept doesn't apply. */
export function planCreditsRemaining(p: PlanFields | null | undefined): number | null {
  if (planOf(p?.plan) !== "plus") return null;
  return Math.max(0, p?.plan_credits_remaining ?? 0);
}

/** Remaining Plus save credits, or null when the concept doesn't apply. */
export function saveCreditsRemaining(p: PlanFields | null | undefined): number | null {
  if (planOf(p?.plan) !== "plus") return null;
  return Math.max(0, p?.save_credits_remaining ?? 0);
}

/**
 * Whether generating a plan is metered for this account, i.e. we should ask the
 * server to spend a credit. True for signed-in free and Plus accounts; false for
 * Pro (unlimited) and logged-out visitors (no profile -> anonymous, unlimited).
 */
export function isPlanMetered(p: PlanFields | null | undefined): boolean {
  if (!p) return false;
  return planOf(p.plan) !== "pro";
}

/** Save equivalent of isPlanMetered. */
export function isSaveMetered(p: PlanFields | null | undefined): boolean {
  if (!p) return false;
  return planOf(p.plan) !== "pro";
}

/**
 * Whether the user may generate a new room plan right now. Pro and logged-out
 * visitors always can; Plus needs a plan credit; a signed-in free user is
 * capped at FREE_PLAN_CAP lifetime plans.
 */
export function canGeneratePlan(p: PlanFields | null | undefined): boolean {
  if (!p) return true; // logged out: anonymous, unlimited
  const t = planOf(p.plan);
  if (t === "pro") return true;
  if (t === "plus") return (p.plan_credits_remaining ?? 0) > 0;
  return (p.free_plans_used ?? 0) < FREE_PLAN_CAP;
}

/**
 * Whether the user may save another design right now. Pro always can; Plus needs
 * a save credit; a signed-in free user is capped at FREE_SAVE_CAP lifetime
 * saves. Logged-out returns true (a named save requires login, gated elsewhere).
 */
export function canSaveDesign(p: PlanFields | null | undefined): boolean {
  if (!p) return true;
  const t = planOf(p.plan);
  if (t === "pro") return true;
  if (t === "plus") return (p.save_credits_remaining ?? 0) > 0;
  return (p.free_saves_used ?? 0) < FREE_SAVE_CAP;
}
