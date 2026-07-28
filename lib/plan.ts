import type { PlanTier, Profile } from "@/lib/auth-context";

/** The one-time Plus price, in whole dollars and in Stripe's cents unit. */
export const PLUS_PRICE_USD = 4.99;
export const PLUS_PRICE_CENTS = 499;

/** Free accounts may keep exactly one *named* saved design. Plus is unlimited. */
export const FREE_SAVED_DESIGN_LIMIT = 1;

/** Normalize any stored plan value to a known tier (defaults to free). */
export function planOf(value: string | null | undefined): PlanTier {
  return value === "plus" ? "plus" : "free";
}

/** Is this profile on Plus? Safe on null/loading (treated as not-Plus). */
export function isPlus(profile: Pick<Profile, "plan"> | null | undefined): boolean {
  return planOf(profile?.plan) === "plus";
}
