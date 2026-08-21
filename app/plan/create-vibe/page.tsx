"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { usePlannerStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { isPro, isPlanMetered } from "@/lib/plan";
import { consumePlanCredit } from "@/lib/plan-credits";
import { generateVibe } from "@/lib/vibe-client";
import { track } from "@/lib/analytics";
import {
  validateVibe,
  vibeHelper,
  VIBE_PLACEHOLDER,
  INSPIRATION_CHIPS,
} from "@/lib/custom-vibe";
import VibeLoading from "@/components/planner/VibeLoading";

// Item 4: the "Create your own vibe" input as its own dedicated page (Pro).
// Left: heading, description, the text input. Right: the inspiration chips
// levitating with staggered, independent idle float. Premium gradient + grid
// paper ground. Same functionality as the old inline panel (validation gate,
// chip tap-to-fill); this is a visual/layout upgrade. Loads the large loading
// state (VibeLoading) during generation.
const MIN_LOADING_MS = 2400;

// Per-chip float + depth so the set levitates independently (no synced bob).
// The horizontal offset (mlClass) is desktop-only, so chips stack flush on mobile.
const CHIP_MOTION = [
  { rotate: -2.5, mlClass: "", dur: "6.5s", delay: "0s", dist: "10px", z: "shadow-[0_18px_40px_-20px_rgba(23,23,43,0.45)]" },
  { rotate: 2, mlClass: "sm:ml-12", dur: "7.8s", delay: "0.5s", dist: "13px", z: "shadow-[0_22px_48px_-22px_rgba(43,78,255,0.4)]" },
  { rotate: -1.5, mlClass: "sm:ml-4", dur: "7.1s", delay: "0.9s", dist: "9px", z: "shadow-[0_16px_36px_-20px_rgba(23,23,43,0.4)]" },
  { rotate: 3, mlClass: "sm:ml-16", dur: "8.3s", delay: "0.3s", dist: "12px", z: "shadow-[0_20px_44px_-22px_rgba(23,23,43,0.42)]" },
];

export default function CreateVibePage() {
  const router = useRouter();
  const room = usePlannerStore((s) => s.room);
  const budget = usePlannerStore((s) => s.budget);
  const setCustomResult = usePlannerStore((s) => s.setCustomResult);
  const { profile, refreshProfile, loading: authLoading } = useAuth();
  const { openUpgrade } = useUpgrade();

  const [hydrated, setHydrated] = useState(false);
  const [text, setText] = useState("");
  const [validationMsg, setValidationMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Wait for the sessionStorage-backed store to rehydrate before any redirect.
  useEffect(() => {
    if (usePlannerStore.persist.hasHydrated()) setHydrated(true);
    return usePlannerStore.persist.onFinishHydration(() => setHydrated(true));
  }, []);

  // Guards: need a room (Step 1), and Pro (Free/Flex/Plus get the upgrade modal
  // and go back to the picker — this is the Pro-only enforcement for the page).
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
    const startedAt = Date.now();

    if (isPlanMetered(profile)) {
      const { blocked } = await consumePlanCredit();
      if (blocked) {
        setGenerating(false);
        setApiError("You're out of plan credits for now.");
        return;
      }
      await refreshProfile();
    }

    const result = await generateVibe({ vibe, budget, bedSize: room?.bedSize, seed: 0 });
    const elapsed = Date.now() - startedAt;
    if (elapsed < MIN_LOADING_MS) await new Promise((r) => setTimeout(r, MIN_LOADING_MS - elapsed));

    if (!result.ok || !result.products || result.products.length === 0) {
      setGenerating(false);
      setApiError(result.error ?? "We couldn't build a room from that. Try tweaking your description.");
      return;
    }
    track("custom_vibe_generated", { mock: result.mock });
    setCustomResult(vibe, result.products, result.mock ?? false);
    router.push("/plan/result");
  }

  // Hold the frame until we know the guards pass (avoids a flash of the form
  // before a non-Pro visitor is redirected).
  if (!hydrated || !room || (!authLoading && !isPro(profile))) {
    return <div className="min-h-[60vh]" aria-busy="true" />;
  }

  return (
    <section className="relative min-h-[calc(100vh-8.5rem)] overflow-hidden">
      {/* Premium ground: soft diagonal gradient + faded grid paper. */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(155deg, #eef1ff 0%, #ffffff 50%, #f5f0ff 100%)" }}
        aria-hidden="true"
      />
      <span className="grid-paper-fade pointer-events-none absolute inset-0 opacity-70" aria-hidden="true" />

      <div className="relative mx-auto max-w-5xl px-5 pb-24 pt-4 sm:px-8 sm:pt-8">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
          Pro · Create your own vibe
        </p>

        <div className="mt-6 grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12">
          {/* LEFT — heading, description, input. */}
          <div>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
              Put your room <br className="hidden sm:block" />
              into <span className="hl">words.</span>
            </h1>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Colors, textures, a mood, a reference — whatever the room feels like in
              your head. We&apos;ll match real products to it and lay them out to your{" "}
              {room.lengthFt} × {room.widthFt} ft room.
            </p>

            <label htmlFor="vibe-input" className="sr-only">
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
              className="mt-6 w-full resize-none rounded-2xl border border-ink/15 bg-white/90 p-4 text-base text-ink shadow-[0_18px_44px_-28px_rgba(23,23,43,0.5)] outline-none backdrop-blur-sm transition-colors placeholder:text-ink-soft/55 focus:border-cobalt"
            />
            <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft/80" aria-live="polite">
              {vibeHelper(text)}
            </p>

            {validationMsg && (
              <p className="mt-3 flex items-start gap-2 rounded-lg border border-highlight/50 bg-highlight/15 px-3 py-2.5 text-sm leading-snug text-ink" role="alert">
                <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
                </svg>
                {validationMsg}
              </p>
            )}
            {apiError && (
              <p className="mt-3 rounded-lg border border-ink/15 bg-white px-3 py-2.5 text-sm leading-snug text-ink" role="alert">
                {apiError}
              </p>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={generating}
              className="mt-6 inline-flex h-13 w-full items-center justify-center rounded-xl bg-cobalt text-base font-semibold text-white shadow-[0_18px_40px_-20px_rgba(43,78,255,0.6)] transition-colors hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-soft sm:w-auto sm:px-10"
            >
              Build my room →
            </button>
          </div>

          {/* RIGHT — inspiration chips, levitating with independent idle float. */}
          <div className="relative">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Need a starting point? Tap one.
            </p>
            <div className="mt-5 flex flex-col gap-4 sm:gap-5">
              {INSPIRATION_CHIPS.map((chip, idx) => {
                const m = CHIP_MOTION[idx % CHIP_MOTION.length];
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => fillFrom(chip)}
                    style={
                      {
                        "--float-dur": m.dur,
                        "--float-delay": m.delay,
                        "--float-dist": m.dist,
                      } as React.CSSProperties
                    }
                    className={`vibe-float group/chip w-fit max-w-[19rem] rounded-2xl border border-ink/10 bg-white/90 px-4 py-3 text-left text-sm leading-snug text-ink backdrop-blur-sm transition-colors hover:border-cobalt/50 ${m.mlClass} ${m.z}`}
                  >
                    <span
                      className="block"
                      style={{ transform: `rotate(${m.rotate}deg)` }}
                    >
                      <span className="font-mono text-[10px] uppercase tracking-wide text-cobalt">
                        Vibe
                      </span>
                      <span className="mt-1 block text-ink-soft transition-colors group-hover/chip:text-ink">
                        &ldquo;{chip}&rdquo;
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {generating && <VibeLoading />}
    </section>
  );
}
