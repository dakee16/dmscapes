"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import RoomCard, { RoomLine } from "@/components/plan-steps/RoomCard";
import BudgetTape from "@/components/plan-steps/BudgetTape";
import Generating, { type GeneratingPicks } from "@/components/plan-steps/Generating";
import { dimsOf, fitSelected, schoolLabel, usd, vibeMeta } from "@/components/plan-steps/room-model";
import CreditMeter from "@/components/site/CreditMeter";
import DesignDisclaimerModal from "@/components/planner/DesignDisclaimerModal";
import CreditConfirmModal from "@/components/planner/CreditConfirmModal";
import { ArrowUpRight } from "@/components/ds/Icons";
import { track } from "@/lib/analytics";
import { categoriesCovered, tierForBudget } from "@/lib/catalog";
import { roomTypeLabel } from "@/lib/format";
import { usePlannerStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { creditLimitReason, canGeneratePlan, headerCreditState } from "@/lib/plan";
import { consumePlanCredit } from "@/lib/plan-credits";
import { useUpgrade } from "@/lib/upgrade-context";
import type { SelectedRoom } from "@/lib/types";
import v from "@/components/plan-steps/Vibe.module.css";
import css from "@/components/plan-steps/Budget.module.css";

const TIER_LABELS = {
  budget: "Essentials",
  mid: "Upgraded",
  premium: "Premium",
} as const;

const QUICK = [300, 500, 650, 1000, 1500];

const FACTS = [
  { h: "Priced to fit", p: "Your room fills with picks chosen to land under this number." },
  { h: "Live Amazon links", p: "Every piece links to a live listing, sizes included." },
  { h: "Change it later", p: "Swap pieces on the canvas and the total follows you." },
];

const NOUNS: Record<string, [string, string]> = {
  bed: ["bed", "beds"],
  desk: ["desk", "desks"],
  dresser: ["dresser", "dressers"],
};

/** "Loaded Atherton Hall, Double Room: 16.4 × 12 ft with the building's beds, desks and dressers." */
function measureLine(room: SelectedRoom, dormName: string | null): string {
  const fit = fitSelected(room);
  const counts = new Map<string, number>();
  for (const f of fit?.furniture ?? []) if (NOUNS[f.type]) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);
  const words = [...counts].map(([t, n]) => NOUNS[t][n === 1 ? 0 : 1]);
  const list = words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words.at(-1)}` : words[0];
  const dims = dimsOf(room.lengthFt, room.widthFt);
  if (dormName && room.source === "catalog") {
    return `Loaded ${dormName}, ${roomTypeLabel(room)}: ${dims}${list ? ` with the building's ${list}` : ""}.`;
  }
  return `Loaded your room: ${dims}${list ? ` with standard ${list}` : ""}.`;
}

/** Step 03 · Budget, then the generate. */
export default function PlanBudgetPage() {
  const router = useRouter();
  const college = usePlannerStore((s) => s.college);
  const dorm = usePlannerStore((s) => s.dorm);
  const room = usePlannerStore((s) => s.room);
  const style = usePlannerStore((s) => s.style);
  const customVibe = usePlannerStore((s) => s.customVibe);
  const budget = usePlannerStore((s) => s.budget);
  const setBudget = usePlannerStore((s) => s.setBudget);
  const resetPlanner = usePlannerStore((s) => s.resetPlanner);

  const { user, profile, refreshProfile, openAuthModal, modalOpen } = useAuth();
  const { openUpgrade } = useUpgrade();

  const [mounted, setMounted] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  // The planning screen: null while idle; ready once the credit is spent.
  const [planning, setPlanning] = useState<{ ready: boolean } | null>(null);
  const generatingRef = useRef(false);
  // Save-before-you-leave heads-up, shown when they tap "Plan my room".
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const budgetTrackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const viewedRef = useRef(false);
  // Set when the user declines the design gate: they're headed home, and we
  // clear the store on the way, so the guards below must NOT hijack that
  // navigation to /plan.
  const exitingRef = useRef(false);

  useEffect(() => setMounted(true), []);

  // Store hydrates from sessionStorage on mount; only then can we trust it.
  // The budget step needs a room (Step 01) and a vibe (Step 02).
  useEffect(() => {
    if (!mounted || exitingRef.current) return;
    if (!room) router.replace("/plan");
    else if (!style) router.replace("/plan/style");
  }, [mounted, room, style, router]);

  // Funnel: the budget step was reached with a room and a vibe.
  useEffect(() => {
    if (!mounted || !room || !style || viewedRef.current) return;
    viewedRef.current = true;
    track("budget_step_viewed", { style });
  }, [mounted, room, style]);

  // Tapping "Plan my room" first raises the save-before-you-leave heads-up;
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

  // Post-gate resume: once a gated visitor is authenticated, their profile is
  // loaded (fetchProfile recreates a free-tier row if one was missing), and the
  // auth modal has closed, we do NOT auto-generate. If they have a design to
  // spend we ask (CreditConfirmModal); if they're already out we send them to
  // the upgrade prompt. Their selections stay in the store either way.
  const pendingGenerateRef = useRef(false);
  const [showCreditConfirm, setShowCreditConfirm] = useState(false);
  // Returning from the dedicated auth page after the design gate: re-arm the
  // resume. The ref is per-mount, so it was lost when we navigated to /login;
  // the auth page appended ?authgate=generate to this URL, so consume it once
  // and re-arm, and the resume effect below fires as soon as auth resolves.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("authgate") === "generate") {
      pendingGenerateRef.current = true;
      url.searchParams.delete("authgate");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
  }, []);
  useEffect(() => {
    if (!pendingGenerateRef.current || !user || !profile || modalOpen) return;
    pendingGenerateRef.current = false;
    if (canGeneratePlan(profile)) {
      setShowCreditConfirm(true);
    } else {
      track("plan_blocked_no_credits");
      openUpgrade(creditLimitReason(profile));
    }
  }, [user, profile, modalOpen, openUpgrade]);

  // The server spends one credit before a new plan opens, for every tier.
  // The planning screen runs alongside the request and never holds the
  // result back beyond its short, skippable preset.
  async function runGenerate() {
    setShowDisclaimer(false);
    if (!style || generatingRef.current) return;
    setGenerationError(null);
    if (!user || !profile) {
      setGenerationError("Your account is still loading. Please try again.");
      return;
    }
    const blockReason = creditLimitReason(profile);
    if (!canGeneratePlan(profile)) {
      track("plan_blocked_no_credits");
      openUpgrade(blockReason);
      return;
    }
    generatingRef.current = true;
    setGenerating(true);
    setPlanning({ ready: false });
    try {
      const { blocked } = await consumePlanCredit();
      void refreshProfile();
      if (blocked) {
        setPlanning(null);
        track("plan_blocked_no_credits");
        openUpgrade(blockReason);
        return;
      }
      usePlannerStore.getState().updatePlanning({ mode: "generated" });
      usePlannerStore.setState({ excluded: null });
      track("plan_credit_consumed");
      // The planning screen opens /plan/result (openPlan) as soon as it can.
      setPlanning({ ready: true });
    } catch (error) {
      setPlanning(null);
      setGenerationError(error instanceof Error ? error.message : "Couldn't start your design. Please try again.");
    } finally {
      generatingRef.current = false;
      setGenerating(false);
    }
  }

  const openPlan = useCallback(() => router.push("/plan/result"), [router]);

  function handleBudget(value: number) {
    setBudget(value);
    if (budgetTrackTimer.current) clearTimeout(budgetTrackTimer.current);
    budgetTrackTimer.current = setTimeout(() => track("budget_set", { amount: value }), 700);
  }

  if (!mounted || !room || !style) {
    return (
      <div className={v.layout} aria-busy="true" aria-label="Loading your budget">
        <div className={v.left}>
          <div className={v.skelTitle} />
          <div className={css.skelFigure} />
        </div>
      </div>
    );
  }

  const tier = tierForBudget(budget);
  // "covers" applies to curated styles only; the custom flow has its own copy.
  const covered = style !== "custom" ? categoriesCovered(style, budget, room.bedSize) : null;
  const vibe = vibeMeta(style, customVibe);
  const picks: GeneratingPicks = covered
    ? { bedding: covered.includes("Bedding"), rug: covered.includes("Rug"), lamp: covered.includes("Desk Lamp") }
    : { bedding: true, rug: true, lamp: true };

  return (
    <div className={v.layout}>
      <div className={v.left}>
        <p className={`ds-eyebrow ${v.eyebrow}`}>Step 03 · Budget</p>
        <h1 className={v.title}>
          <span className={`${v.titleSans} ${css.titleSans}`}>Set a budget.</span>{" "}
          <span className={v.titleSerif}>Every pick fits it.</span>
        </h1>

        <output htmlFor="budget-slider" className={css.figure}>
          {usd(budget)}
        </output>

        <BudgetTape id="budget-slider" value={budget} onChange={handleBudget} />

        <div className={css.quick} role="group" aria-label="Quick picks">
          <span className={css.quickLabel} aria-hidden="true">
            Quick picks
          </span>
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              className={css.quickBtn}
              aria-pressed={budget === q}
              onClick={() => handleBudget(q)}
            >
              {usd(q)}
            </button>
          ))}
        </div>

        <p className={css.covers} aria-live="polite">
          <span className={css.tier}>{TIER_LABELS[tier]}</span>
          {covered ? (
            covered.length ? (
              <span>
                Your <strong className={css.num}>{usd(budget)}</strong> budget covers:{" "}
                <strong>{covered.join(", ").toLowerCase()}</strong>.
              </span>
            ) : null
          ) : (
            <span>
              Your <strong className={css.num}>{usd(budget)}</strong> budget sets the price range for your own vibe.
            </span>
          )}
        </p>

        <div className={v.phoneOnly}>
          <div className={css.phoneSummary}>
            <RoomLine variant="summary" />
          </div>
        </div>

        <div className={css.facts}>
          {FACTS.map((f) => (
            <div key={f.h} className={css.fact}>
              <span className={css.factHead}>{f.h}</span>
              <span className={css.factBody}>{f.p}</span>
            </div>
          ))}
        </div>

        <Link href="/plan/style" className={`${css.backLink} ${css.backPhone}`}>
          Back to vibe
        </Link>
      </div>

      <div className={v.rail}>
        <div className={v.desktopOnly}>
          <RoomCard showBudget vibeChange />
        </div>
        <div className={css.go}>
          {generationError && (
            <p role="alert" className={css.error}>
              {generationError}
            </p>
          )}
          <div className={css.goBar}>
            <button type="button" disabled={!style || generating} onClick={handleDesignClick} className={css.plan}>
              {generating ? "Planning…" : "Plan my room"}
              <ArrowUpRight size={24} strokeWidth={2.8} />
            </button>
            <div className={css.costs}>
              <span>Uses 1 plan credit</span>
              <span>Saving is always free</span>
            </div>
          </div>
          {/* Current paid balance beside the generation action. */}
          <CreditMeter className={css.meter} />
          <Link href="/plan/style" className={`${css.backLink} ${css.backDesk}`}>
            Back to vibe
          </Link>
        </div>
      </div>

      {showDisclaimer && <DesignDisclaimerModal onConfirm={runGenerate} onCancel={() => setShowDisclaimer(false)} />}

      {/* Design-gate confirmation, shown once a gated visitor has logged in.
          Yes spends a design and generates; No discards the in-progress
          selections and returns home. */}
      <AnimatePresence>
        {showCreditConfirm && (
          <CreditConfirmModal
            key="credit-confirm"
            credit={headerCreditState(profile)}
            onConfirm={() => {
              setShowCreditConfirm(false);
              runGenerate();
            }}
            onCancel={() => {
              setShowCreditConfirm(false);
              exitingRef.current = true;
              resetPlanner();
              router.push("/");
            }}
          />
        )}
      </AnimatePresence>

      {planning && (
        <Generating
          room={room}
          summary={[schoolLabel(college), dorm?.name, vibe?.name, usd(budget)].filter(Boolean).join(" · ")}
          measure={measureLine(room, dorm?.name ?? null)}
          imagine={
            style === "custom"
              ? `Finding real pieces for your own vibe that land under ${usd(budget)}.`
              : `Choosing ${vibe?.name ?? "your"} pieces that land under ${usd(budget)}.`
          }
          picks={picks}
          colors={vibe?.dots ?? ["#2449FF", "#DCE1F5", "#16161D"]}
          ready={planning.ready}
          onOpen={openPlan}
        />
      )}
    </div>
  );
}
