"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StyleCard from "@/components/planner/StyleCard";
import { track } from "@/lib/analytics";
import { categoriesCovered, tierForBudget } from "@/lib/catalog";
import { STYLES, isPlusStyle } from "@/lib/styles";
import { usePlannerStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { isPaid, isPlusTier, isPlanMetered, canGeneratePlan } from "@/lib/plan";
import { consumePlanCredit } from "@/lib/plan-credits";
import { useUpgrade } from "@/lib/upgrade-context";
import CreditMeter from "@/components/site/CreditMeter";
import DesignDisclaimerModal from "@/components/planner/DesignDisclaimerModal";
import type { StyleId } from "@/lib/types";

const TIER_LABELS = { budget: "Essentials", mid: "Upgraded", premium: "Premium" } as const;

export default function PlanStylePage() {
  const router = useRouter();
  const room = usePlannerStore((s) => s.room);
  const style = usePlannerStore((s) => s.style);
  const budget = usePlannerStore((s) => s.budget);
  const setStyle = usePlannerStore((s) => s.setStyle);
  const setBudget = usePlannerStore((s) => s.setBudget);

  const { user, profile, refreshProfile, openAuthModal, modalOpen } = useAuth();
  const { openUpgrade } = useUpgrade();
  // Vibe access: all 9 vibes unlock for any paid tier (Plus or Pro).
  const allVibes = isPaid(profile);

  const [mounted, setMounted] = useState(false);
  const [generating, setGenerating] = useState(false);
  // Save-before-you-leave heads-up, shown when they tap "Design my room".
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const budgetTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  // Store hydrates from sessionStorage on mount; only then can we trust `room`.
  useEffect(() => {
    if (mounted && !room) router.replace("/plan");
  }, [mounted, room, router]);

  function handleStyle(id: StyleId) {
    // Gated vibes stay visible for free users, but selecting one opens the
    // upgrade modal instead of silently blocking. Plus/Pro select freely.
    if (isPlusStyle(id) && !allVibes) {
      track("style_locked_clicked", { style: id });
      openUpgrade("style");
      return;
    }
    setStyle(id);
    track("style_selected", { style: id });
  }

  // Tapping "Design my room" first raises the save-before-you-leave heads-up;
  // confirming there runs the actual generation. Logged-out visitors are gated
  // here at the final step: we intercept, open the auth modal, and resume the
  // generation automatically after they sign in (selections already live in the
  // sessionStorage-backed store, so nothing is lost).
  function handleDesignClick() {
    if (!style || generating) return;
    if (!user) {
      pendingGenerateRef.current = true;
      openAuthModal("generate");
      return;
    }
    setShowDisclaimer(true);
  }

  // Resume-after-login: once a gated visitor is authenticated, their profile is
  // loaded, and the auth modal has fully closed, run the generation they asked
  // for. Reads runGenerate through a ref so this effect needn't depend on it.
  const pendingGenerateRef = useRef(false);
  const runGenerateRef = useRef<() => void>(() => {});
  useEffect(() => {
    if (pendingGenerateRef.current && user && profile && !modalOpen) {
      pendingGenerateRef.current = false;
      runGenerateRef.current();
    }
  }, [user, profile, modalOpen]);

  // Generate the plan. Signed-in free and Plus accounts spend one plan credit
  // here (the "click through to a result" moment); Pro and logged-out visitors
  // generate without limit. When a counter is empty the block reason depends on
  // the tier: a free user is sent to Plus/Pro, a Plus user to recharge/Pro.
  async function runGenerate() {
    setShowDisclaimer(false);
    if (!style || generating) return;
    if (isPlanMetered(profile)) {
      const blockReason = isPlusTier(profile) ? "plan-credits" : "free-plan-limit";
      // Fast path: an account we already know is out of plans skips the server
      // round-trip and goes straight to the right upgrade prompt.
      if (!canGeneratePlan(profile)) {
        track("plan_blocked_no_credits");
        openUpgrade(blockReason);
        return;
      }
      setGenerating(true);
      // Server is authoritative for the actual decrement (atomic, race-safe).
      const { blocked } = await consumePlanCredit();
      if (blocked) {
        setGenerating(false);
        track("plan_blocked_no_credits");
        openUpgrade(blockReason);
        return;
      }
      track("plan_credit_consumed");
      await refreshProfile();
    }
    router.push("/plan/result");
  }
  // Keep the resume effect pointed at the latest closure of runGenerate.
  runGenerateRef.current = runGenerate;

  function handleBudget(value: number) {
    setBudget(value);
    if (budgetTrackTimer.current) clearTimeout(budgetTrackTimer.current);
    budgetTrackTimer.current = setTimeout(() => track("budget_set", { amount: value }), 700);
  }

  if (!mounted || !room) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-5 sm:px-8" aria-busy="true" aria-label="Loading styles">
        <div className="h-9 w-2/3 animate-pulse rounded-lg bg-ink/8" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-36 animate-pulse rounded-xl bg-ink/8" />
          ))}
        </div>
        <div className="h-24 animate-pulse rounded-xl bg-ink/8" />
      </div>
    );
  }

  const tier = tierForBudget(budget);
  const covered = style ? categoriesCovered(style, budget, room?.bedSize) : null;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-36 sm:px-8 sm:pb-24">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
        Step 2 · Style &amp; budget
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        What&apos;s your <span className="hl">vibe</span>?
      </h1>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-soft">
        Every style is a complete plan: bedding, lighting, storage, and decor, arranged
        to your {room.lengthFt} × {room.widthFt} ft room.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {STYLES.map((s) => (
          <StyleCard
            key={s.id}
            style={s}
            selected={style === s.id}
            locked={isPlusStyle(s.id) && !allVibes}
            unlocked={isPlusStyle(s.id) && allVibes}
            onSelect={() => handleStyle(s.id)}
          />
        ))}
      </div>

      <div className="mt-8 rounded-xl border border-ink/10 bg-white p-5 sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="budget-slider" className="font-display text-lg font-bold tracking-tight">
            Your budget
          </label>
          <div className="flex items-baseline gap-2.5">
            <span className="rounded-full bg-highlight/50 px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-ink">
              {TIER_LABELS[tier]}
            </span>
            <output htmlFor="budget-slider" className="font-mono text-3xl font-semibold text-ink">
              ${budget}
            </output>
          </div>
        </div>

        <input
          id="budget-slider"
          type="range"
          min={200}
          max={1500}
          step={50}
          value={budget}
          onChange={(e) => handleBudget(Number(e.target.value))}
          className="mt-5 h-2 w-full cursor-pointer appearance-none rounded-full bg-ink/10 accent-cobalt"
          aria-valuetext={`$${budget}`}
        />
        <div className="mt-1.5 flex justify-between font-mono text-xs text-ink-soft">
          <span>$200</span>
          <span>$1,500</span>
        </div>

        <p className="mt-4 min-h-10 text-sm leading-relaxed text-ink-soft" aria-live="polite">
          {covered ? (
            <>
              Your <span className="font-mono font-semibold text-ink">${budget}</span> budget
              covers:{" "}
              <span className="font-medium text-ink">{covered.join(", ").toLowerCase()}</span>.
            </>
          ) : (
            <>Pick a style above to see what your budget covers.</>
          )}
        </p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/8 bg-paper/92 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-md sm:static sm:z-auto sm:mt-8 sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
        {/* Plus only: how many plan credits remain, right beside the action. */}
        <CreditMeter className="mb-2.5 justify-center sm:justify-start" />
        <button
          type="button"
          disabled={!style || generating}
          onClick={handleDesignClick}
          className="h-13 w-full cursor-pointer rounded-xl bg-cobalt text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-soft sm:h-12 sm:w-auto sm:px-10"
        >
          {generating ? "Designing…" : "Design my room →"}
        </button>
      </div>

      {showDisclaimer && (
        <DesignDisclaimerModal
          onConfirm={runGenerate}
          onCancel={() => setShowDisclaimer(false)}
        />
      )}
    </div>
  );
}
