"use client";

import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { showCredits, planCreditsRemaining, isPlusTier, creditLimitReason } from "@/lib/plan";

// Live generation balance for Flex, Plus, and Pro. Saving uses no credits.
export default function CreditMeter({
  className = "",
  recharge = true,
}: {
  className?: string;
  /** Show the inline Recharge button at zero. Off where a page already has its
   *  own recharge control right beside the meter (e.g. the account page). */
  recharge?: boolean;
}) {
  const { profile } = useAuth();
  const { openUpgrade } = useUpgrade();
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
      {spent && recharge && (
        <button
          type="button"
          onClick={() => openUpgrade(creditLimitReason(profile))}
          className="cursor-pointer rounded-full bg-cobalt px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-cobalt-deep"
        >
          {isPlusTier(profile) ? "Recharge" : "Buy"}
        </button>
      )}
    </div>
  );
}
