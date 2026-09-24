import type { PlanTier } from "@/lib/auth-context";

/** One-time purchases. Only generation spends credits; saving and editing do not. */
export const PLUS_PRICE_USD = 4.99;
export const PLUS_PRICE_CENTS = 499;
export const PLUS_PRICE_WAS_USD = 7.99;
export const PRO_PRICE_USD = 14.99;
export const PRO_PRICE_CENTS = 1499;
export const PRO_PRICE_WAS_USD = 19.99;
export const RECHARGE_PRICE_USD = 2.99;
export const RECHARGE_PRICE_CENTS = 299;
export const PLUS_INITIAL_CREDITS = 3;
export const PRO_INITIAL_CREDITS = 10;
export const RECHARGE_CREDITS = 3;
export const FREE_PLAN_CAP = 1;
export const CREDIT_PLAN_VERSION = "2026-09-24";

/** All tiers can top up. A Free buyer becomes Flex; paid tiers keep their tools. */
export const FLEX_CREDIT_PRICE_USD = 0.99;
export const FLEX_CREDIT_PRICE_CENTS = 99;
export const FLEX_MIN_QTY = 1;
export const FLEX_MAX_QTY = 100;
export const FLEX_DEFAULT_QTY = 3;

export type PurchaseType = "plus" | "pro" | "recharge" | "flex_credits";
export const PURCHASE_TYPES: readonly PurchaseType[] = ["plus", "pro", "recharge", "flex_credits"];

export interface PlanFields {
  plan?: PlanTier | string | null;
  plan_credits_remaining?: number | null;
  free_plans_used?: number | null;
  plus_features_unlocked?: boolean | null;
}

export function planOf(value: string | null | undefined): PlanTier {
  return value === "plus" || value === "pro" || value === "flex" ? value : "free";
}
export const isFree = (p: PlanFields | null | undefined): boolean => planOf(p?.plan) === "free";
export const isFlex = (p: PlanFields | null | undefined): boolean => planOf(p?.plan) === "flex";
export const isPro = (p: PlanFields | null | undefined): boolean => planOf(p?.plan) === "pro";
export const isPlusTier = (p: PlanFields | null | undefined): boolean => planOf(p?.plan) === "plus";

export function planLabel(p: PlanFields | string | null | undefined): string {
  const t = typeof p === "string" ? planOf(p) : planOf(p?.plan);
  return t === "pro" ? "Pro" : t === "plus" ? "Plus" : t === "flex" ? "Flex" : "Free";
}

export function canBuyFlexCredits(p: PlanFields | null | undefined): boolean { return Boolean(p); }
export function isPaid(p: PlanFields | null | undefined): boolean { return isPlusTier(p) || isPro(p); }
export function hasFeatures(p: PlanFields | null | undefined): boolean {
  return isPro(p) || p?.plus_features_unlocked === true;
}
export function showCredits(p: PlanFields | null | undefined): boolean { return Boolean(p) && !isFree(p); }

/** A legacy Pro NULL balance receives the new allowance once. The server's first
 * atomic spend/top-up persists a number; zero must never reset to the allowance.
 * Existing finite balances, including previously purchased credits, are kept. */
export function planCreditsRemaining(p: PlanFields | null | undefined): number | null {
  if (!p || isFree(p)) return null;
  return Math.max(0, p.plan_credits_remaining ?? (isPro(p) ? PRO_INITIAL_CREDITS : 0));
}

export interface HeaderCreditState {
  show: boolean;
  designsLeft: number;
  empty: boolean;
  plus: boolean;
  flex: boolean;
  tier: PlanTier;
  canBuyCredits: boolean;
}
export function headerCreditState(p: PlanFields | null | undefined): HeaderCreditState {
  const tier = planOf(p?.plan);
  const designsLeft = !p ? 0 : tier === "free"
    ? Math.max(0, FREE_PLAN_CAP - (p.free_plans_used ?? 0))
    : planCreditsRemaining(p) ?? 0;
  return { show: Boolean(p), designsLeft, empty: designsLeft <= 0,
    plus: tier === "plus", flex: tier === "flex", tier, canBuyCredits: Boolean(p) };
}

export function creditLimitReason(p: PlanFields | null | undefined): "pro-credits" | "plan-credits" | "flex-credits" | "free-plan-limit" {
  return isPro(p) ? "pro-credits" : isPlusTier(p) ? "plan-credits" : isFlex(p) ? "flex-credits" : "free-plan-limit";
}

export function isPlanMetered(p: PlanFields | null | undefined): boolean { return Boolean(p); }
export function canGeneratePlan(p: PlanFields | null | undefined): boolean {
  return Boolean(p) && headerCreditState(p).designsLeft > 0;
}
/** Every signed-in account saves without using generation credits. */
export function isSaveMetered(_p: PlanFields | null | undefined): boolean { return false; }
export function canSaveDesign(_p: PlanFields | null | undefined): boolean { return true; }
export const canUse3D = isPro;
export const canBuild3D = isPro;
