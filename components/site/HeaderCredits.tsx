"use client";

import { useAuth } from "@/lib/auth-context";
import {
  isPro,
  isPlusTier,
  planCreditsRemaining,
  FREE_PLAN_CAP,
} from "@/lib/plan";

// Floating credit callout that lives OUTSIDE the header island, on the open grid
// to its right (wide desktop only; the wrapper in Nav handles the breakpoint).
// It reads the same live auth profile that drives the inline CreditMeter, so it
// updates the instant a plan is spent, with no page refresh and no second data
// source. Just text on the grid: no card, fill, or border, in the site's small
// mono/uppercase stat style (cf. "200+ rooms planned" in the hero).
//
// Only room-plan designs are metered; saving is unlimited, so there's no saves
// line here anymore.

export default function HeaderCredits() {
  const { user, profile } = useAuth();

  // Logged out (or profile not loaded yet): show nothing.
  if (!user || !profile) return null;

  const base =
    "font-mono text-[11px] font-medium uppercase leading-none tracking-wide text-ink-soft";

  // Pro: unlimited plans, one word in place of the count.
  if (isPro(profile)) {
    return (
      <div className={base}>
        <span>Unlimited</span>
      </div>
    );
  }

  // Plus: live remaining plan credits. Free: the fixed 1-plan lifetime cap, and
  // once it's spent there's nothing left to surface, so hide entirely.
  const plansLeft = isPlusTier(profile)
    ? planCreditsRemaining(profile) ?? 0
    : Math.max(0, FREE_PLAN_CAP - (profile.free_plans_used ?? 0));
  if (!isPlusTier(profile) && plansLeft <= 0) return null;

  return (
    <div className={base}>
      <span className="whitespace-nowrap">
        Designs <span aria-hidden="true">·</span> {plansLeft} left
      </span>
    </div>
  );
}
