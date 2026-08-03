"use client";

import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
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
  const { openUpgrade } = useUpgrade();

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

  // Plus: live remaining plan credits. Free: the fixed 1-plan lifetime cap.
  const plus = isPlusTier(profile);
  const plansLeft = plus
    ? planCreditsRemaining(profile) ?? 0
    : Math.max(0, FREE_PLAN_CAP - (profile.free_plans_used ?? 0));
  const empty = plansLeft <= 0;

  // At zero we keep the count visible (never vanish) and surface a one-tap way to
  // get more: Plus members recharge 5 credits ($4.99), free accounts upgrade.
  // The wrapper in Nav is pointer-events-none, so the button re-enables itself.
  return (
    <div className="flex items-center gap-2">
      <span className={`${base} whitespace-nowrap`}>
        Designs <span aria-hidden="true">·</span> {plansLeft} left
      </span>
      {empty && (
        <button
          type="button"
          onClick={() => openUpgrade(plus ? "plan-credits" : "free-plan-limit")}
          className="pointer-events-auto cursor-pointer rounded-full border border-cobalt/30 bg-cobalt/[0.07] px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-cobalt transition-colors hover:bg-cobalt hover:text-white"
        >
          {plus ? "Recharge" : "Upgrade"}
        </button>
      )}
    </div>
  );
}
