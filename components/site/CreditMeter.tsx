"use client";

import { useAuth } from "@/lib/auth-context";
import { showCredits, planCreditsRemaining, saveCreditsRemaining } from "@/lib/plan";

// Live credit counters, shown only for Plus accounts (free is a fixed 1+1 and
// pro is unlimited, so neither has a moving count worth surfacing). The two
// counters are always shown as independent numbers, never combined. Cobalt when
// there's credit left, muted when a counter is spent.
function Pill({ n, label }: { n: number; label: string }) {
  const spent = n <= 0;
  return (
    <span
      className={`inline-flex items-baseline gap-1 rounded-full border px-2.5 py-1 font-mono text-[11px] font-semibold uppercase tracking-wide ${
        spent
          ? "border-ink/15 bg-ink/[0.03] text-ink-soft"
          : "border-cobalt/25 bg-cobalt/[0.06] text-cobalt"
      }`}
    >
      <span className="text-[13px] leading-none">{n}</span>
      {label}
    </span>
  );
}

export default function CreditMeter({
  className = "",
  only,
}: {
  className?: string;
  /** Render just one counter instead of both (for inline, near-action hints). */
  only?: "plans" | "saves";
}) {
  const { profile } = useAuth();
  if (!showCredits(profile)) return null;
  const plans = planCreditsRemaining(profile) ?? 0;
  const saves = saveCreditsRemaining(profile) ?? 0;
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {only !== "saves" && <Pill n={plans} label="plans left" />}
      {only !== "plans" && <Pill n={saves} label="saves left" />}
    </div>
  );
}
