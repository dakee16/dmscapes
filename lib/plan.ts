import type { PlanTier } from "@/lib/auth-context";

/**
 * Three-tier plan model, metered on room-plan generation only. Saving a design
 * is always free and unlimited for any signed-in account, so there is no save
 * counter. Prices are all one-time (no subscriptions).
 *   Free     1 lifetime room plan (then upgrade); saving is unlimited
 *   Plus     $4.99  -> 5 plan credits, all vibes, all features permanently.
 *                      Recharge $2.99 adds 5 more plan credits.
 *   Pro      $14.99 -> unlimited plans, all vibes/features.
 *
 * Launch-deal pricing: the _WAS_ constants are the pre-deal prices, shown struck
 * through beside the current price on the pricing page.
 */
export const PLUS_PRICE_USD = 4.99;
export const PLUS_PRICE_CENTS = 499;
export const PLUS_PRICE_WAS_USD = 7.99;
export const PRO_PRICE_USD = 14.99;
export const PRO_PRICE_CENTS = 1499;
export const PRO_PRICE_WAS_USD = 19.99;
export const RECHARGE_PRICE_USD = 2.99;
export const RECHARGE_PRICE_CENTS = 299;

/**
 * Flex à-la-carte plan credits: $0.99 each, bought in any quantity (minimum 1 —
 * each credit is meaningfully priced, so there's no pack floor). A `free` buyer
 * becomes `flex` on their first purchase; `flex` and `plus` buyers keep their
 * tier and just top up the shared plan_credits_remaining pool. Pro never buys.
 */
export const FLEX_CREDIT_PRICE_USD = 0.99;
export const FLEX_CREDIT_PRICE_CENTS = 99;
export const FLEX_MIN_QTY = 1;
export const FLEX_MAX_QTY = 100;
export const FLEX_DEFAULT_QTY = 3;

/** Credits granted by the initial Plus purchase, per counter. */
export const PLUS_INITIAL_CREDITS = 5;
/** Credits added to BOTH counters by each recharge. */
export const RECHARGE_CREDITS = 5;
/** Free-tier lifetime caps, per counter. */
export const FREE_PLAN_CAP = 1;
export const FREE_SAVE_CAP = 1;

/** The one-time purchases the checkout/webhook understand. "flex_credits" is the
 *  à-la-carte credit purchase (quantity-priced); the other three are fixed. */
export type PurchaseType = "plus" | "pro" | "recharge" | "flex_credits";
export const PURCHASE_TYPES: readonly PurchaseType[] = [
  "plus",
  "pro",
  "recharge",
  "flex_credits",
];

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
  return value === "plus"
    ? "plus"
    : value === "pro"
      ? "pro"
      : value === "flex"
        ? "flex"
        : "free";
}

/** Free tier (or logged out). Flex is its OWN tier, so this is false for flex. */
export function isFree(p: PlanFields | null | undefined): boolean {
  return planOf(p?.plan) === "free";
}

/** Flex tier: free-like features, but meters plan generation on purchased
 *  à-la-carte credits (the shared plan_credits_remaining pool) like Plus. */
export function isFlex(p: PlanFields | null | undefined): boolean {
  return planOf(p?.plan) === "flex";
}

/** Human tier label for display (header badge, billing page, account dropdown). */
export function planLabel(p: PlanFields | string | null | undefined): string {
  const t = typeof p === "string" ? planOf(p) : planOf(p?.plan);
  return t === "pro" ? "Pro" : t === "plus" ? "Plus" : t === "flex" ? "Flex" : "Free";
}

/**
 * Whether this account can buy à-la-carte Flex credits. Free, Flex, and Plus all
 * can (Free becomes Flex on first purchase; Flex/Plus top up the same pool). Pro
 * is unlimited so the option is irrelevant and hidden. Logged-out has no profile
 * (planOf -> free), but callers gate on the profile existing before offering it.
 */
export function canBuyFlexCredits(p: PlanFields | null | undefined): boolean {
  const t = planOf(p?.plan);
  return t === "free" || t === "flex" || t === "plus";
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
 * Whether we show live credit counters for this account. Plus and Flex both have
 * finite, moving counts worth displaying; free (a fixed 1) and pro (unlimited)
 * don't.
 */
export function showCredits(p: PlanFields | null | undefined): boolean {
  const t = planOf(p?.plan);
  return t === "plus" || t === "flex";
}

/** Remaining plan credits (Plus or Flex, which share the counter), or null when
 *  the concept doesn't apply (free/pro). */
export function planCreditsRemaining(p: PlanFields | null | undefined): number | null {
  const t = planOf(p?.plan);
  if (t !== "plus" && t !== "flex") return null;
  return Math.max(0, p?.plan_credits_remaining ?? 0);
}

/** Tier-aware header design-credit state, shared by the desktop chip, the mobile
 *  avatar badge, and the profile dropdown. Free = the fixed lifetime cap minus
 *  used; Plus = live remaining credits; Pro is unlimited (nothing to count) and
 *  logged-out has no profile, so both return show:false. Saving is unlimited for
 *  everyone, so there is no saves counter. `plus` picks the CTA (recharge vs
 *  upgrade) and its openUpgrade reason. */
export interface HeaderCreditState {
  /** Always true for a signed-in profile: free/flex/plus show a finite count,
   *  pro shows unlimited. (Callers still guard on the profile existing.) */
  show: boolean;
  /** Pro: unlimited designs, shown as ∞ with no count or CTA. */
  unlimited: boolean;
  designsLeft: number;
  /** Out of designs — swap the count for the tier CTA. Never true for pro. */
  empty: boolean;
  /** Plus specifically (drives the recharge vs buy messaging). */
  plus: boolean;
  /** Flex specifically. */
  flex: boolean;
  /** The normalized tier, for label/branch decisions. */
  tier: PlanTier;
  /** Can buy à-la-carte Flex credits from the header (free/flex/plus, not pro). */
  canBuyCredits: boolean;
}
export function headerCreditState(p: PlanFields | null | undefined): HeaderCreditState {
  const t = planOf(p?.plan);
  const plus = t === "plus";
  const flex = t === "flex";
  const unlimited = t === "pro";
  // Plus and Flex meter on the shared credit pool; free shows its lifetime cap.
  const designsLeft =
    plus || flex
      ? Math.max(0, p?.plan_credits_remaining ?? 0)
      : Math.max(0, FREE_PLAN_CAP - (p?.free_plans_used ?? 0));
  return {
    show: true,
    unlimited,
    designsLeft,
    empty: !unlimited && designsLeft <= 0,
    plus,
    flex,
    tier: t,
    canBuyCredits: !unlimited,
  };
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

/** Saving is never metered anymore: every signed-in account saves for free. */
export function isSaveMetered(_p: PlanFields | null | undefined): boolean {
  return false;
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
  // Plus and Flex both spend the shared à-la-carte credit pool.
  if (t === "plus" || t === "flex") return (p.plan_credits_remaining ?? 0) > 0;
  return (p.free_plans_used ?? 0) < FREE_PLAN_CAP;
}

/**
 * Whether the user may save another design right now. Saving is unlimited for
 * everyone: free, Plus, and Pro all save without limit (a named save still
 * requires login, gated elsewhere). Kept as a helper so callers read clearly.
 */
export function canSaveDesign(_p: PlanFields | null | undefined): boolean {
  return true;
}
