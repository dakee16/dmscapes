"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track, sessionId } from "@/lib/analytics";
import { BUY_INTENT_EVENT } from "@/lib/purchase-intent";
import { usePlannerStore } from "@/lib/store";
import { useAuth } from "@/lib/auth-context";
import type { PurchaseSurveyRequest, PurchaseSurveyResponse } from "@/lib/api-types";

const DONE_KEY = "dormscape-purchase-survey-done";
/** Minimum time away (ms) before a return counts — filters accidental switches. */
const AWAY_MS = 3500;

const SHARE_URL = "https://dormscape.us";
const SHARE_LABEL = "dormscape.us";

type Step = "ask" | "thanks";

/**
 * Post-purchase confirmation. Arms on the first buy click of the session, then
 * shows a one-time prompt when the user returns to the tab (after being away
 * long enough to have actually visited Amazon). "Yes" transitions in-place to a
 * thank-you + share state. Result page only.
 */
export default function PurchaseSurvey({ cartTotal }: { cartTotal: number }) {
  const { user } = useAuth();
  const college = usePlannerStore((s) => s.college);
  const dorm = usePlannerStore((s) => s.dorm);
  const room = usePlannerStore((s) => s.room);
  const style = usePlannerStore((s) => s.style);
  const budget = usePlannerStore((s) => s.budget);

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("ask");
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Detection state kept in refs so listeners always see the latest without
  // re-subscribing: armed = a buy click happened; leftAt = when the tab hid;
  // done = already shown this session (never show twice).
  const armedRef = useRef(false);
  const leftAtRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const yesBtnRef = useRef<HTMLButtonElement>(null);

  // Latest cart total / design for the survey payload, read at fire time.
  const snapshotRef = useRef({ cartTotal, college, dorm, room, style, budget, userId: user?.id });
  snapshotRef.current = { cartTotal, college, dorm, room, style, budget, userId: user?.id };

  const postSurvey = useCallback((response: PurchaseSurveyResponse) => {
    const s = snapshotRef.current;
    const body: PurchaseSurveyRequest = {
      session_id: sessionId(),
      user_id: s.userId ?? null,
      response,
      saved_room_id: null,
      room_snapshot: {
        college_id: s.college?.id ?? null,
        dorm_id: s.dorm?.id ?? null,
        style: s.style ?? null,
        budget: s.budget ?? null,
        room_dimensions: s.room
          ? {
              length_ft: s.room.lengthFt,
              width_ft: s.room.widthFt,
              room_type: s.room.type,
              occupants: s.room.occupants,
            }
          : null,
      },
      cart_total: Number.isFinite(s.cartTotal) ? s.cartTotal : null,
    };
    fetch("/api/purchase-surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      keepalive: true,
    }).catch(() => {});
  }, []);

  // Wire up detection once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    doneRef.current = window.sessionStorage.getItem(DONE_KEY) === "1";
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");

    function reveal() {
      if (doneRef.current) return;
      doneRef.current = true;
      window.sessionStorage.setItem(DONE_KEY, "1");
      armedRef.current = false;
      setStep("ask");
      setCopied(false);
      setOpen(true);
      track("purchase_prompt_shown");
    }

    function maybeShow() {
      if (doneRef.current || !armedRef.current) return;
      const leftAt = leftAtRef.current;
      if (leftAt === null || Date.now() - leftAt < AWAY_MS) return;
      reveal();
    }

    function onBuyIntent() {
      if (doneRef.current) return;
      armedRef.current = true;
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        if (armedRef.current && !doneRef.current) leftAtRef.current = Date.now();
      } else {
        maybeShow();
      }
    }

    window.addEventListener(BUY_INTENT_EVENT, onBuyIntent);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", maybeShow);
    return () => {
      window.removeEventListener(BUY_INTENT_EVENT, onBuyIntent);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", maybeShow);
    };
  }, []);

  // Focus the primary action when the ask step opens (parity with AuthModal).
  useEffect(() => {
    if (!open || step !== "ask") return;
    const t = setTimeout(() => yesBtnRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open, step]);

  const close = useCallback(() => setOpen(false), []);

  // Backdrop / Escape / X on the ask step reads as the neutral "still deciding".
  const dismiss = useCallback(() => {
    if (step === "ask") {
      postSurvey("still_deciding");
      track("purchase_prompt_still_deciding");
    }
    close();
  }, [step, postSurvey, close]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismiss();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  if (!open) return null;

  function handleYes() {
    postSurvey("yes");
    track("purchase_prompt_yes");
    setCopied(false);
    setStep("thanks");
  }

  function handleStillDeciding() {
    postSurvey("still_deciding");
    track("purchase_prompt_still_deciding");
    close();
  }

  function handleNo() {
    postSurvey("no");
    track("purchase_prompt_no");
    close();
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      track("share_link_copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleShare() {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title: "Dormscape",
        text: "Plan your dorm room for free with Dormscape.",
        url: SHARE_URL,
      });
      track("share_link_shared");
    } catch {
      // User cancelled the share sheet — nothing to do.
    }
  }

  const title = step === "ask" ? "Did you grab everything?" : "Nice — your room's happening.";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-survey-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="snap-in w-full max-w-md rounded-t-2xl border border-ink/10 bg-paper p-5 shadow-2xl sm:rounded-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <h2 id="purchase-survey-title" className="font-display text-xl font-bold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {step === "ask" ? (
          <div className="mt-1">
            <p className="text-sm leading-relaxed text-ink-soft">
              You just headed to Amazon. Did everything you wanted make it into your cart?
            </p>
            <div className="mt-5 space-y-2.5">
              <button
                ref={yesBtnRef}
                type="button"
                onClick={handleYes}
                className="h-12 w-full cursor-pointer rounded-xl bg-cobalt text-base font-semibold text-white transition-colors hover:bg-cobalt-deep"
              >
                Yes, all set
              </button>
              <button
                type="button"
                onClick={handleStillDeciding}
                className="h-12 w-full cursor-pointer rounded-xl border border-ink/15 bg-white text-sm font-semibold text-ink transition-colors hover:border-ink/30"
              >
                Still deciding
              </button>
              <button
                type="button"
                onClick={handleNo}
                className="block w-full cursor-pointer py-1 text-center text-sm text-ink-soft transition-colors hover:text-ink"
              >
                No, not yet
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-1">
            <p className="text-sm leading-relaxed text-ink-soft">
              Everything&apos;s on its way. If Dormscape made this easier, send it to a
              roommate — it&apos;s free for them too.
            </p>

            <div className="mt-5">
              <p className="mb-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-ink-soft">
                Share Dormscape
              </p>
              {canShare && (
                <button
                  type="button"
                  onClick={handleShare}
                  className="mb-2 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-cobalt text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
                  </svg>
                  Share
                </button>
              )}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={SHARE_LABEL}
                  aria-label="Dormscape link"
                  onFocus={(e) => e.currentTarget.select()}
                  className="h-11 flex-1 rounded-xl border border-ink/15 bg-white px-4 font-mono text-sm text-ink outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="h-11 shrink-0 cursor-pointer rounded-xl border border-ink/15 bg-white px-4 text-sm font-semibold text-ink transition-colors hover:border-cobalt hover:text-cobalt"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={close}
              className="mt-5 h-11 w-full cursor-pointer rounded-xl bg-ink text-sm font-semibold text-white transition-colors hover:bg-cobalt"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
