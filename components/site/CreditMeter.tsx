"use client";

import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { showCredits, planCreditsRemaining, isPlusTier, creditLimitReason } from "@/lib/plan";
import css from "@/components/plan-steps/Meter.module.css";

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
    <div className={`${css.meter} ${className}`}>
      <span className={css.chip} data-spent={spent}>
        <span className={css.n}>{plans}</span>
        plans left
      </span>
      {spent && recharge && (
        <button type="button" onClick={() => openUpgrade(creditLimitReason(profile))} className={css.buy}>
          {isPlusTier(profile) ? "Recharge" : "Buy"}
        </button>
      )}
    </div>
  );
}
