"use client";

import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { headerCreditState } from "@/lib/plan";

// Compact design-credits chip that lives INSIDE the header island, just left of
// the profile avatar (see Nav). Desktop only (md+); on mobile the avatar badge +
// profile dropdown carry this instead. Free and Plus show a live "Designs · N"
// count; at zero the chip swaps to a one-tap Recharge (Plus) / Upgrade (free)
// button. Pro (unlimited) and logged-out show nothing. Saving is unlimited, so
// there is no saves counter.
export default function HeaderCredits() {
  const { user, profile } = useAuth();
  const { openUpgrade } = useUpgrade();

  const c = headerCreditState(profile);
  if (!user || !profile) return null;

  if (c.unlimited) {
    return (
      <span
        className="hidden shrink-0 items-baseline gap-1 rounded-full border border-cobalt/25 bg-cobalt/[0.06] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-cobalt md:inline-flex"
        title="Room designs left"
      >
        Designs <span aria-hidden="true">·</span>
        <span className="text-[13px] leading-none">&infin;</span>
      </span>
    );
  }

  if (c.empty) {
    return (
      <button
        type="button"
        onClick={() => openUpgrade(c.plus ? "plan-credits" : "free-plan-limit")}
        className="hidden shrink-0 cursor-pointer items-center rounded-full bg-cobalt px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-cobalt-deep md:inline-flex"
      >
        {c.plus ? "Recharge" : "Upgrade"}
      </button>
    );
  }

  return (
    <span
      className="hidden shrink-0 items-baseline gap-1 rounded-full border border-cobalt/25 bg-cobalt/[0.06] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-cobalt md:inline-flex"
      title="Room designs left"
    >
      Designs <span aria-hidden="true">·</span>
      <span className="text-[13px] leading-none">{c.designsLeft}</span>
    </span>
  );
}
