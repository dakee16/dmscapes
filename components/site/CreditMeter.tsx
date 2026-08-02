"use client";

import { useAuth } from "@/lib/auth-context";
import { showCredits, planCreditsRemaining } from "@/lib/plan";

// Live plan-credit counter, shown only for Plus accounts (free is a fixed 1 plan
// and pro is unlimited, so neither has a moving count worth surfacing). Saving a
// design is unlimited for every signed-in account, so there's no save counter.
// Cobalt while there's credit left, muted once it's spent.
export default function CreditMeter({ className = "" }: { className?: string }) {
  const { profile } = useAuth();
  if (!showCredits(profile)) return null;
  const plans = planCreditsRemaining(profile) ?? 0;
  const spent = plans <= 0;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span
        className={`inline-flex items-baseline gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide ${
          spent
            ? "border-ink/15 bg-ink/[0.03] text-ink-soft"
            : "border-cobalt/25 bg-cobalt/[0.06] text-cobalt"
        }`}
      >
        <span className="text-[13px] leading-none">{plans}</span>
        plans left
      </span>
    </div>
  );
}
