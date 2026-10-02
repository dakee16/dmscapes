"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlannerStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { isPro, canGeneratePlan } from "@/lib/plan";
import { consumePlanCredit } from "@/lib/plan-credits";
import { generateVibe } from "@/lib/vibe-client";
import { tierForBudget } from "@/lib/catalog";
import { track } from "@/lib/analytics";
import { validateVibe, vibeHelper, VIBE_PLACEHOLDER, INSPIRATION_CHIPS } from "@/lib/custom-vibe";
import RoomCard from "@/components/plan-steps/RoomCard";
import BudgetTape from "@/components/plan-steps/BudgetTape";
import Generating from "@/components/plan-steps/Generating";
import { dimsOf, schoolLabel, usd, vibeMeta } from "@/components/plan-steps/room-model";
import { ArrowUpRight } from "@/components/ds/Icons";
import v from "@/components/plan-steps/Vibe.module.css";
import css from "@/components/plan-steps/CreateVibe.module.css";

const TIER_LABELS = { budget: "Essentials", mid: "Upgraded", premium: "Premium" } as const;

// The "Create your own vibe" input as its own page (Pro). Left: heading,
// description, the text input and the budget. Right: the room so far and the
// inspiration chips (tap to fill). Same functionality as before (validation
// gate, chip tap-to-fill); the wait is the shared planning screen.
export default function CreateVibePage() {
  const router = useRouter();
  const room = usePlannerStore((s) => s.room);
  const college = usePlannerStore((s) => s.college);
  const dorm = usePlannerStore((s) => s.dorm);
  const budget = usePlannerStore((s) => s.budget);
  const setBudget = usePlannerStore((s) => s.setBudget);
  const setCustomResult = usePlannerStore((s) => s.setCustomResult);
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const { openUpgrade } = useUpgrade();

  const [hydrated, setHydrated] = useState(false);
  const [text, setText] = useState("");
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  // The planning screen: null while idle; ready once matches are in and paid for.
  const [planning, setPlanning] = useState<{ ready: boolean; vibe: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const generatingRef = useRef(false);

  // Wait for the sessionStorage-backed store to rehydrate before any redirect.
  useEffect(() => {
    if (usePlannerStore.persist.hasHydrated()) setHydrated(true);
    return usePlannerStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Text typed into the vibe step's Pro field arrives as ?vibe=.
  useEffect(() => {
    const carried = new URLSearchParams(window.location.search).get("vibe");
    if (carried) setText(carried.slice(0, 500));
  }, []);

  // Guards: need a room (Step 1), and Pro (Free/Flex/Plus get the upgrade modal
  // and go back to the picker, this is the Pro-only enforcement for the page).
  useEffect(() => {
    if (!hydrated) return;
    if (!room) {
      router.replace("/plan");
    } else if (!authLoading && !isPro(profile)) {
      openUpgrade("custom-vibe");
      router.replace("/plan/style");
    }
  }, [hydrated, room, authLoading, profile, router, openUpgrade]);

  function fillFrom(chip: string) {
    setText(chip);
    setValidationMsg(null);
    setApiError(null);
    textareaRef.current?.focus();
  }

  async function handleGenerate() {
    if (generatingRef.current) return;
    if (!isPro(profile)) { openUpgrade("custom-vibe"); return; }
    const vibe = text.trim();
    const check = validateVibe(vibe);
    if (!check.ok) {
      setValidationMsg(check.message ?? null);
      track("custom_vibe_validation_failed");
      return;
    }
    setValidationMsg(null);
    setApiError(null);
    if (!canGeneratePlan(profile)) { openUpgrade("pro-credits"); return; }
    generatingRef.current = true;
    setGenerating(true);
    setPlanning({ ready: false, vibe });

    try {
      const result = await generateVibe({ vibe, budget, bedSize: room?.bedSize, seed: 0 });
      if (!result.ok || !result.products?.length) {
        setPlanning(null);
        setApiError(result.error ?? "We couldn't build a room from that. Try tweaking your description.");
        return;
      }
      // Charge only when matches are ready. A failed search uses no credit.
      const { blocked } = await consumePlanCredit();
      void refreshProfile();
      if (blocked) {
        setPlanning(null);
        openUpgrade("pro-credits");
        return;
      }
      track("custom_vibe_generated", { mock: result.mock });
      setCustomResult(vibe, result.products, result.mock ?? false);
      // The planning screen opens /plan/result (openPlan) as soon as it can.
      setPlanning({ ready: true, vibe });
    } catch (error) {
      setPlanning(null);
      setApiError(error instanceof Error ? error.message : "Couldn't start your design. Please try again.");
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }

  const openPlan = useCallback(() => router.push("/plan/result"), [router]);

  // Hold the frame until we know the guards pass (avoids a flash of the form
  // before a non-Pro visitor is redirected).
  if (!hydrated || !room || (!authLoading && !isPro(profile))) {
    return <div className={css.hold} aria-busy="true" />;
  }

  return (
    <div className={v.layout}>
      <div className={v.left}>
        <p className={`ds-eyebrow ${v.eyebrow}`}>Pro · Create your own vibe</p>
        <h1 className={v.title}>
          <span className={v.titleSans}>Put your room</span>{" "}
          <span className={v.titleSerif}>into words.</span>
        </h1>
        <p className={css.lede}>
          Colors, textures, a mood, a reference, whatever the room feels like in your head. We&apos;ll match real
          products to it and lay them out to your {room.lengthFt} × {room.widthFt} ft room.
        </p>

        <label htmlFor="vibe-input" className="ds-sr">
          Describe your vibe
        </label>
        <textarea
          id="vibe-input"
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (validationMsg) setValidationMsg(null);
            if (apiError) setApiError(null);
          }}
          rows={4}
          placeholder={VIBE_PLACEHOLDER}
          aria-describedby="vibe-helper"
          className={`ds-input ${css.textarea}`}
        />
        <p id="vibe-helper" className={css.helper} aria-live="polite">
          {vibeHelper(text)}
        </p>

        {validationMsg && (
          <p className={css.warn} role="alert">
            {validationMsg}
          </p>
        )}
        {apiError && (
          <p className={css.error} role="alert">
            {apiError}
          </p>
        )}

        {/* Budget: the same tape as the budget step, so a custom vibe is
            always priced just like the curated vibes. */}
        <div className={css.budget}>
          <div className={css.budgetHead}>
            <span className={css.budgetLabel}>Your budget</span>
            <span className={css.tier}>{TIER_LABELS[tierForBudget(budget)]}</span>
            <output htmlFor="vibe-budget" className={css.budgetFigure}>
              {usd(budget)}
            </output>
          </div>
          <BudgetTape id="vibe-budget" value={budget} onChange={setBudget} size="sm" />
        </div>

        <div className={css.goBar}>
          <button type="button" onClick={handleGenerate} disabled={generating} className={css.build}>
            {generating ? "Building…" : "Build my room"}
            <ArrowUpRight size={22} strokeWidth={2.8} />
          </button>
          <span className={css.cost}>Uses 1 plan credit once your matches are ready</span>
        </div>
      </div>

      <div className={`${v.rail} ${css.rail}`}>
        <div className={v.desktopOnly}>
          <RoomCard />
        </div>
        <div className={css.chips}>
          <p className={css.chipsLabel}>Need a starting point? Tap one.</p>
          <ul className={css.chipList}>
            {INSPIRATION_CHIPS.map((chip) => (
              <li key={chip}>
                <button type="button" onClick={() => fillFrom(chip)} className={css.chip}>
                  <span className={css.chipTag}>Vibe</span>
                  <span className={css.chipText}>&ldquo;{chip}&rdquo;</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {planning && (
        <Generating
          room={room}
          summary={[schoolLabel(college), dorm?.name, `“${planning.vibe}”`, usd(budget)].filter(Boolean).join(" · ")}
          eyebrow="From your words to your room"
          measure={`Loaded your ${dimsOf(room.lengthFt, room.widthFt)} room with its standard furniture.`}
          imagine={`Finding real pieces for “${planning.vibe}” that land under ${usd(budget)}.`}
          picks={{ bedding: true, rug: true, lamp: true }}
          colors={vibeMeta("custom")!.dots}
          ready={planning.ready}
          onOpen={openPlan}
        />
      )}
    </div>
  );
}
