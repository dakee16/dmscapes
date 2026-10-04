"use client";

import Modal from "@/components/site/Modal";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track, sessionId } from "@/lib/analytics";
import { BUY_INTENT_EVENT, SURVEY_ID_KEY } from "@/lib/purchase-intent";
import { usePlannerStore } from "@/lib/store";
import { getBrowserClient } from "@/lib/supabase-browser";
import { CloseIcon } from "@/components/studio-ui/icons";
import d from "./Dialog.module.css";
import type {
  PurchaseSurveyRequest,
  PurchaseSurveyResponse,
  PurchaseSurveyResponseBody,
} from "@/lib/api-types";

const DONE_KEY = "dormscape-purchase-survey-done";
/** Minimum time away (ms) before a return counts, filters accidental switches. */
const AWAY_MS = 3500;

/**
 * Post-purchase confirmation. Arms on the first buy click of the session, then
 * shows a one-time prompt when the user returns to the tab (after being away
 * long enough to have actually visited Amazon). "Yes, all set" hands off to the
 * /thank-you confirmation page; the two not-yet answers just close.
 */
export default function PurchaseSurvey({ cartTotal }: { cartTotal: number }) {
  const router = useRouter();
  const college = usePlannerStore((s) => s.college);
  const dorm = usePlannerStore((s) => s.dorm);
  const room = usePlannerStore((s) => s.room);
  const style = usePlannerStore((s) => s.style);
  const budget = usePlannerStore((s) => s.budget);

  const [open, setOpen] = useState(false);

  // Detection state kept in refs so listeners always see the latest without
  // re-subscribing: armed = a buy click happened; leftAt = when the tab hid;
  // done = already shown this session (never show twice).
  const armedRef = useRef(false);
  const leftAtRef = useRef<number | null>(null);
  const doneRef = useRef(false);
  const yesBtnRef = useRef<HTMLButtonElement>(null);

  // Latest cart total / design for the survey payload, read at fire time.
  const snapshotRef = useRef({ cartTotal, college, dorm, room, style, budget });
  snapshotRef.current = { cartTotal, college, dorm, room, style, budget };

  const postSurvey = useCallback(async (response: PurchaseSurveyResponse) => {
    const s = snapshotRef.current;
    const body: PurchaseSurveyRequest = {
      session_id: sessionId(),
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
    // Attribution: the API reads the signed-in user from this bearer token
    // (never from the body, which would be spoofable).
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = (await getBrowserClient()?.auth.getSession())?.data.session?.access_token;
    if (token) headers.Authorization = `Bearer ${token}`;
    fetch("/api/purchase-surveys", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      keepalive: true,
    })
      .then((res) => (res.ok ? (res.json() as Promise<PurchaseSurveyResponseBody>) : null))
      .then((data) => {
        if (data?.id) window.sessionStorage.setItem(SURVEY_ID_KEY, data.id);
      })
      .catch(() => {});
  }, []);

  // Wire up detection once.
  useEffect(() => {
    if (typeof window === "undefined") return;
    doneRef.current = window.sessionStorage.getItem(DONE_KEY) === "1";

    function reveal() {
      if (doneRef.current) return;
      doneRef.current = true;
      window.sessionStorage.setItem(DONE_KEY, "1");
      armedRef.current = false;
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

  // Focus the primary action when the prompt opens (parity with AuthModal).
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => yesBtnRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  // Backdrop / Escape / X read as the neutral "still deciding".
  const dismiss = useCallback(() => {
    postSurvey("still_deciding");
    track("purchase_prompt_still_deciding");
    close();
  }, [postSurvey, close]);

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
    close();
    router.push("/thank-you");
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

  return (
    <Modal
      className={d.layer}
      role="dialog"
      aria-modal="true"
      aria-labelledby="purchase-survey-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className={`${d.card} ${d.wide}`}>
        <button type="button" onClick={dismiss} aria-label="Close" className={d.close}><CloseIcon size={20} /></button>
        <p className={d.eyebrow}>Back from Amazon</p>
        <h2 id="purchase-survey-title" className={d.title}>
          Did you grab <em>everything?</em>
        </h2>
        <p className={d.body}>
          You just headed to Amazon. Did everything you wanted make it into your cart?
        </p>
        <div className={d.panel}>
          <p>{Number.isFinite(cartTotal) ? `The $${cartTotal.toFixed(0)} plan` : "The plan"}</p>
          <button ref={yesBtnRef} type="button" onClick={handleYes} className={d.yes}>
            Yes, all set
          </button>
        </div>
        <div className={d.stack}>
          <button type="button" onClick={handleStillDeciding} className={d.secondary}>
            Still deciding
          </button>
          <button type="button" onClick={handleNo} className={d.quiet}>
            No, not yet
          </button>
        </div>
      </div>
    </Modal>
  );
}
