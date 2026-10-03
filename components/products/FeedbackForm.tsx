"use client";

import { useState } from "react";
import { track, sessionId } from "@/lib/analytics";
import { SURVEY_ID_KEY } from "@/lib/purchase-intent";
import { getBrowserClient } from "@/lib/supabase-browser";
import type { FeedbackRequest } from "@/lib/api-types";
import { Check } from "@/components/ds/Icons";
import css from "@/components/site/Feedback.module.css";

const STARS = [1, 2, 3, 4, 5] as const;

function Star() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.5l2.94 5.96 6.58.96-4.76 4.64 1.12 6.55L12 17.52l-5.88 3.09 1.12-6.55L2.48 9.42l6.58-.96z" />
    </svg>
  );
}

/**
 * The shared feedback UI, star rating (required) + optional write-up, used
 * both on the /thank-you confirmation page and from the footer "Feedback" modal.
 * Posts to /api/feedback (purchase_feedback table). Footer feedback carries no
 * purchase_survey_id and no room design; the API/table already treat those as
 * nullable, so a standalone rating logs cleanly.
 */
export default function FeedbackForm({
  source,
  headline = "How did we do?",
  subhead = "A star rating sends it. Words are welcome, never required.",
  autoFocus = false,
  onSubmitted,
}: {
  /** Where the rating came from, drives whether it links back to a purchase. */
  source: "thank_you" | "footer";
  headline?: string;
  subhead?: string;
  autoFocus?: boolean;
  onSubmitted?: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || busy) return;
    setBusy(true);
    setError("");
    const body: FeedbackRequest = {
      session_id: sessionId(),
      rating,
      feedback_text: text.trim() || null,
      // Only post-purchase feedback links back to a survey row; footer feedback
      // is standalone and leaves this null.
      purchase_survey_id:
        source === "thank_you" ? window.sessionStorage.getItem(SURVEY_ID_KEY) : null,
    };
    try {
      // Attribution: the API reads the signed-in user from this bearer token
      // (never from the body, which would be spoofable).
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      const token = (await getBrowserClient()?.auth.getSession())?.data.session
        ?.access_token;
      if (token) headers.Authorization = `Bearer ${token}`;
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        keepalive: true,
      });
      if (!response.ok) throw new Error("Feedback request failed");
    } catch {
      setError("Couldn't send your feedback. Your words are still here; please try again.");
      setBusy(false);
      return;
    }
    track("feedback_submitted", { rating, source });
    setSubmitted(true);
    setBusy(false);
    onSubmitted?.();
  }

  // Star fill previews the hover, falls back to the committed rating.
  const shown = hovered || rating;

  if (submitted) {
    return (
      <div className={css.done} role="status">
        <span className={css.doneMark} aria-hidden="true"><Check size={22} /></span>
        <div>
          <p className={css.doneTitle}>Thanks for the feedback.</p>
          <p className={css.doneText}>It goes straight into making the planner better.</p>
        </div>
      </div>
    );
  }

  return (
    <form className={css.form} onSubmit={handleSubmit} noValidate>
      {/* Headline is optional, the footer modal already titles itself "Feedback". */}
      {headline && <p className={css.headline}>{headline}</p>}
      <p className={css.subhead}>{subhead}</p>
      <div
        className={css.stars}
        role="radiogroup"
        aria-label="Rate Dormscape from 1 to 5 stars"
        onMouseLeave={() => setHovered(0)}
      >
        {STARS.map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            tabIndex={n === (rating || 1) ? 0 : -1}
            autoFocus={autoFocus && n === 1}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            onKeyDown={(event) => {
              let next: number = n;
              if (event.key === "ArrowRight" || event.key === "ArrowDown") next = n % 5 + 1;
              else if (event.key === "ArrowLeft" || event.key === "ArrowUp") next = (n + 3) % 5 + 1;
              else if (event.key === "Home") next = 1;
              else if (event.key === "End") next = 5;
              else return;
              event.preventDefault();
              setHovered(0);
              setRating(next);
              event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(`button[aria-label="${next} star${next > 1 ? "s" : ""}"]`)?.focus();
            }}
            className={css.star}
            data-on={n <= shown}
          >
            <Star />
          </button>
        ))}
        {rating > 0 && <span className={css.score}>{rating}/5</span>}
      </div>
      <textarea
        aria-label="Your feedback (optional)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        placeholder="What worked? What was clunky? (optional)"
        className={`ds-input ${css.text}`}
      />
      {error && <p className={css.error} role="alert">{error}</p>}
      <div className={css.foot}>
        <p className={css.hint} aria-live="polite">
          {rating < 1 ? "Pick a star rating to submit." : " "}
        </p>
        <button
          type="submit"
          disabled={rating < 1 || busy}
          aria-busy={busy || undefined}
          className={`ds-btn ds-btn--ink-yellow ds-btn--sm ${css.submit}`}
        >
          {busy ? "Sending…" : "Submit feedback"}
        </button>
      </div>
    </form>
  );
}
