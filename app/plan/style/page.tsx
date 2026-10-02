"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import StyleCard from "@/components/planner/StyleCard";
import CreateVibeBanner from "@/components/planner/CreateVibeBanner";
import RoomCard, { RoomLine } from "@/components/plan-steps/RoomCard";
import PlusCard from "@/components/plan-steps/PlusCard";
import { ArrowRight } from "@/components/ds/Icons";
import { ChevronLeft } from "@/components/plan-steps/icons";
import { track } from "@/lib/analytics";
import { STYLES, isPlusStyle } from "@/lib/styles";
import { CUSTOM_VIBE_ENABLED } from "@/lib/custom-vibe";
import { usePlannerStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { isPaid, isPro } from "@/lib/plan";
import { useUpgrade } from "@/lib/upgrade-context";
import type { StyleId } from "@/lib/types";
import css from "@/components/plan-steps/Vibe.module.css";

/** Step 02 · Vibe. The budget now has its own step (/plan/budget). */
export default function PlanStylePage() {
  const router = useRouter();
  const room = usePlannerStore((s) => s.room);
  const style = usePlannerStore((s) => s.style);
  const setStyle = usePlannerStore((s) => s.setStyle);

  const { profile, loading: authLoading } = useAuth();
  const { openUpgrade } = useUpgrade();
  // Vibe access: all 9 vibes unlock for any paid tier (Plus or Pro).
  const allVibes = isPaid(profile);
  // "Create your own vibe" is Pro-only (distinct from the Plus-gated styles).
  const pro = isPro(profile);

  const [mounted, setMounted] = useState(false);
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

  // The custom field: Pro opens the vibe input (carrying anything typed);
  // everyone else gets the existing upgrade modal.
  function handleCustom(text?: string) {
    if (!pro) {
      track("custom_vibe_locked_clicked");
      openUpgrade("custom-vibe");
      return;
    }
    track("custom_vibe_opened");
    const q = text?.trim();
    router.push(q ? `/plan/create-vibe?vibe=${encodeURIComponent(q)}` : "/plan/create-vibe");
  }

  if (!mounted || !room) {
    return (
      <div className={css.layout} aria-busy="true" aria-label="Loading vibes">
        <div className={css.left}>
          <div className={css.skelTitle} />
          <div className={css.grid}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className={css.skelCard} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const showPlus = !authLoading && !allVibes;

  return (
    <div className={css.layout}>
      <div className={css.left}>
        <p className={`ds-eyebrow ${css.eyebrow}`}>Step 02 · Vibe</p>
        <h1 className={css.title}>
          <span className={css.titleSans}>Pick a vibe.</span>{" "}
          <span className={css.titleSerif}>We make it fit.</span>
        </h1>
        <div className={css.phoneOnly}>
          <RoomLine variant="pill" />
        </div>

        <div role="group" aria-label="Vibes" className={css.grid}>
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

        {CUSTOM_VIBE_ENABLED && <CreateVibeBanner onSelect={handleCustom} unlocked={pro} />}

        {showPlus && (
          <div className={css.phoneOnly}>
            <PlusCard compact />
          </div>
        )}
      </div>

      <div className={css.rail}>
        <div className={css.desktopOnly}>
          <RoomCard />
        </div>
        {showPlus && (
          <div className={css.desktopOnly}>
            <PlusCard />
          </div>
        )}
        <div className={css.nav}>
          <button type="button" className={css.back} onClick={() => router.push("/plan")}>
            <ChevronLeft size={20} className={css.backIcon} />
            <span className={css.backText}>Back</span>
          </button>
          <button
            type="button"
            className={css.next}
            disabled={!style}
            onClick={() => router.push("/plan/budget")}
          >
            Next: budget
            <ArrowRight size={20} strokeWidth={2.8} />
          </button>
        </div>
      </div>
    </div>
  );
}
