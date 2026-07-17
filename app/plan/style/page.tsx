"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import StyleCard from "@/components/planner/StyleCard";
import { track } from "@/lib/analytics";
import { categoriesCovered, tierForBudget } from "@/lib/catalog";
import { STYLES } from "@/lib/styles";
import { usePlannerStore } from "@/lib/store";
import type { StyleId } from "@/lib/types";

const TIER_LABELS = { budget: "Essentials", mid: "Upgraded", premium: "Premium" } as const;

export default function PlanStylePage() {
  const router = useRouter();
  const room = usePlannerStore((s) => s.room);
  const style = usePlannerStore((s) => s.style);
  const budget = usePlannerStore((s) => s.budget);
  const setStyle = usePlannerStore((s) => s.setStyle);
  const setBudget = usePlannerStore((s) => s.setBudget);

  const [mounted, setMounted] = useState(false);
  const budgetTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  // Store hydrates from sessionStorage on mount — only then can we trust `room`.
  useEffect(() => {
    if (mounted && !room) router.replace("/plan");
  }, [mounted, room, router]);

  function handleStyle(id: StyleId) {
    setStyle(id);
    track("style_selected", { style: id });
  }

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
  const covered = style ? categoriesCovered(style, budget) : null;

  return (
    <div className="mx-auto max-w-3xl px-5 pb-36 sm:px-8 sm:pb-24">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
        Step 2 · Style &amp; budget
      </p>
      <h1 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        What&apos;s your <span className="hl">vibe</span>?
      </h1>
      <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ink-soft">
        Every style is a complete plan — bedding, lighting, storage, decor — arranged to
        your {room.lengthFt} × {room.widthFt} ft room.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {STYLES.map((s) => (
          <StyleCard
            key={s.id}
            style={s}
            selected={style === s.id}
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
        <button
          type="button"
          disabled={!style}
          onClick={() => router.push("/plan/result")}
          className="h-13 w-full cursor-pointer rounded-xl bg-cobalt text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-soft sm:h-12 sm:w-auto sm:px-10"
        >
          Design my room →
        </button>
      </div>
    </div>
  );
}
