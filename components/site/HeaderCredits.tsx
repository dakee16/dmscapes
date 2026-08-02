"use client";

import { useAuth } from "@/lib/auth-context";
import {
  isPro,
  isPlusTier,
  planCreditsRemaining,
  saveCreditsRemaining,
  FREE_PLAN_CAP,
  FREE_SAVE_CAP,
} from "@/lib/plan";

// Floating credit callout that lives OUTSIDE the header island, on the open grid
// to its right (wide desktop only; the wrapper in Nav handles the breakpoint).
// It reads the same live auth profile that drives the inline CreditMeter, so it
// updates the instant a plan or save is spent, with no page refresh and no
// second data source. Just text on the grid: no card, fill, or border, in the
// site's small mono/uppercase stat style (cf. "203 rooms planned" in the hero).

// One stat line, e.g. "Designs · 1 left".
function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <span className="whitespace-nowrap">
      {label} <span aria-hidden="true">·</span> {value}
    </span>
  );
}

export default function HeaderCredits() {
  const { user, profile } = useAuth();

  // Logged out (or profile not loaded yet): show nothing.
  if (!user || !profile) return null;

  const base =
    "flex flex-col items-end gap-1 font-mono text-[11px] font-medium uppercase leading-none tracking-wide text-ink-soft";

  // Pro: unlimited on both counters, one word in place of the two count lines.
  if (isPro(profile)) {
    return (
      <div className={base}>
        <span>Unlimited</span>
      </div>
    );
  }

  let plansLeft: number;
  let savesLeft: number;
  if (isPlusTier(profile)) {
    // Plus: live remaining credits on each independent counter.
    plansLeft = planCreditsRemaining(profile) ?? 0;
    savesLeft = saveCreditsRemaining(profile) ?? 0;
  } else {
    // Free: fixed 1 + 1 lifetime caps. Once BOTH are spent, hide entirely.
    plansLeft = Math.max(0, FREE_PLAN_CAP - (profile.free_plans_used ?? 0));
    savesLeft = Math.max(0, FREE_SAVE_CAP - (profile.free_saves_used ?? 0));
    if (plansLeft <= 0 && savesLeft <= 0) return null;
  }

  return (
    <div className={base}>
      <StatLine label="Designs" value={`${plansLeft} left`} />
      <StatLine label="Saves" value={`${savesLeft} left`} />
    </div>
  );
}
