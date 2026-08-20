"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import BrandLoader from "@/components/site/BrandLoader";
import { usePlannerStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { isPlanMetered } from "@/lib/plan";
import { consumePlanCredit } from "@/lib/plan-credits";
import { generateVibe } from "@/lib/vibe-client";
import { track } from "@/lib/analytics";
import {
  validateVibe,
  vibeHelper,
  VIBE_PLACEHOLDER,
  INSPIRATION_CHIPS,
  VIBE_LOADING_LINES,
} from "@/lib/custom-vibe";
import type { BedSize } from "@/lib/types";

// The vibe input experience (Pro). Owns the textarea, soft guidance, tap-to-fill
// inspiration chips, the pre-flight validation gate, and the dedicated branded
// loading state. On a valid submit it runs the pipeline, stores the result, and
// hands off to the shared result page.
const MIN_LOADING_MS = 2400; // let the narrative loader read as progress

export default function CreateVibePanel({
  budget,
  bedSize,
}: {
  budget: number;
  bedSize?: BedSize;
}) {
  const router = useRouter();
  const setCustomResult = usePlannerStore((s) => s.setCustomResult);
  const { profile, refreshProfile } = useAuth();

  const [text, setText] = useState("");
  // Validation only surfaces after a submit attempt, so typing isn't nagged.
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loadingLine, setLoadingLine] = useState(VIBE_LOADING_LINES[0]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Cycle the narrative loading copy while the pipeline runs.
  useEffect(() => {
    if (!generating) return;
    let i = 0;
    const t = setInterval(() => {
      i = (i + 1) % VIBE_LOADING_LINES.length;
      setLoadingLine(VIBE_LOADING_LINES[i]);
    }, 900);
    return () => clearInterval(t);
  }, [generating]);

  function fillFrom(chip: string) {
    setText(chip);
    setValidationMsg(null);
    setApiError(null);
    textareaRef.current?.focus();
  }

  async function handleGenerate() {
    if (generating) return;
    const vibe = text.trim();
    const check = validateVibe(vibe);
    if (!check.ok) {
      setValidationMsg(check.message ?? null);
      track("custom_vibe_validation_failed");
      return;
    }
    setValidationMsg(null);
    setApiError(null);
    setGenerating(true);
    setLoadingLine(VIBE_LOADING_LINES[0]);
    const startedAt = Date.now();

    // Pro is unlimited (isPlanMetered=false), so this is a no-op for the only
    // audience today; kept so the credit accounting is correct if the gate ever
    // opens to metered tiers.
    if (isPlanMetered(profile)) {
      const { blocked } = await consumePlanCredit();
      if (blocked) {
        setGenerating(false);
        setApiError("You're out of plan credits for now.");
        return;
      }
      await refreshProfile();
    }

    const result = await generateVibe({ vibe, budget, bedSize, seed: 0 });

    // Hold the loader for a beat so the narrative copy is legible even when the
    // mock returns instantly.
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_MS) {
      await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));
    }

    if (!result.ok || !result.products || result.products.length === 0) {
      setGenerating(false);
      setApiError(result.error ?? "We couldn't build a room from that. Try tweaking your description.");
      return;
    }
    track("custom_vibe_generated", { mock: result.mock });
    setCustomResult(vibe, result.products, result.mock ?? false);
    router.push("/plan/result");
  }

  return (
    <div className="mt-8 rounded-xl border border-ink/10 bg-white p-5 sm:p-6">
      <label htmlFor="vibe-input" className="font-display text-lg font-bold tracking-tight">
        Describe your vibe
      </label>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        Colors, textures, a mood, a reference — whatever the room feels like in your head.
      </p>

      <textarea
        id="vibe-input"
        ref={textareaRef}
        value={text}
        onChange={(e) => {
          setText(e.target.value);
          if (validationMsg) setValidationMsg(null);
          if (apiError) setApiError(null);
        }}
        rows={3}
        placeholder={VIBE_PLACEHOLDER}
        className="mt-4 w-full resize-none rounded-xl border border-ink/15 bg-white p-3.5 text-base text-ink outline-none transition-colors placeholder:text-ink-soft/55 focus:border-cobalt"
      />

      {/* Soft, non-blocking guidance. */}
      <p className="mt-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-soft/80" aria-live="polite">
        {vibeHelper(text)}
      </p>

      {/* Warm validation message (only after a failed submit). */}
      {validationMsg && (
        <p className="mt-3 flex items-start gap-2 rounded-lg border border-highlight/50 bg-highlight/15 px-3 py-2.5 text-sm leading-snug text-ink" role="alert">
          <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-ink" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
          </svg>
          {validationMsg}
        </p>
      )}
      {apiError && (
        <p className="mt-3 rounded-lg border border-ink/15 bg-card px-3 py-2.5 text-sm leading-snug text-ink" role="alert">
          {apiError}
        </p>
      )}

      {/* Tap-to-fill inspiration. */}
      <p className="mt-5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
        Need a starting point?
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {INSPIRATION_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => fillFrom(chip)}
            className="rounded-full border border-ink/15 bg-card px-3 py-1.5 text-left text-xs leading-snug text-ink-soft transition-colors hover:border-cobalt/50 hover:text-cobalt"
          >
            {chip}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={handleGenerate}
        disabled={generating}
        className="mt-6 h-13 w-full cursor-pointer rounded-xl bg-cobalt text-base font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-soft sm:h-12"
      >
        Build my room →
      </button>

      {/* Dedicated loading state: branded mark + cycling narrative copy. */}
      {generating && (
        <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-6 bg-paper/95 px-6 text-center backdrop-blur-sm">
          <BrandLoader label="" />
          <p key={loadingLine} className="fade-in font-display text-lg font-bold tracking-tight text-ink">
            {loadingLine}
          </p>
          <p className="max-w-xs font-mono text-[11px] uppercase tracking-[0.16em] text-ink-soft">
            Matching live products to your vibe — this takes a little longer than a preset.
          </p>
        </div>
      )}
    </div>
  );
}
