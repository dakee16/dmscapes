"use client";

import { useState } from "react";
import { track, sessionId } from "@/lib/analytics";
import { SURVEY_ID_KEY } from "@/lib/purchase-intent";
import { getBrowserClient } from "@/lib/supabase-browser";
import type { FeedbackRequest } from "@/lib/api-types";

const STARS = [1, 2, 3, 4, 5] as const;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating < 1 || busy) return;
    setBusy(true);
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
      await fetch("/api/feedback", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch {
      // Feedback is fire-and-forget; never strand the user on a network blip.
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
      <div className="snap-in flex items-start gap-3" role="status">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cobalt/10 text-cobalt">
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <div>
          <p className="font-display text-lg font-bold tracking-tight">
            Thanks for the feedback.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            It goes straight into making the planner better.
          </p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Headline is optional, the footer modal already titles itself "Feedback". */}
      {headline && (
        <p className="font-display text-lg font-bold tracking-tight">{headline}</p>
      )}
      <p className={`text-sm leading-relaxed text-ink-soft ${headline ? "mt-1" : ""}`}>
        {subhead}
      </p>
      <div
        className="mt-4 flex items-center gap-1"
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
            autoFocus={autoFocus && n === 1}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHovered(n)}
            className={`cursor-pointer p-0.5 text-3xl leading-none transition-colors ${
              n <= shown ? "text-highlight" : "text-ink/15 hover:text-ink/30"
            }`}
          >
            ★
          </button>
        ))}
        {rating > 0 && (
          <span className="ml-2 font-mono text-xs text-ink-soft">{rating}/5</span>
        )}
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={2000}
        placeholder="What worked? What was clunky? (optional)"
        className="mt-4 min-h-24 w-full resize-y rounded-xl border border-ink/15 bg-white px-4 py-3 text-sm leading-relaxed text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ink-soft" aria-live="polite">
          {rating < 1 ? "Pick a star rating to submit." : " "}
        </p>
        <button
          type="submit"
          disabled={rating < 1 || busy}
          className="h-11 cursor-pointer rounded-xl bg-cobalt px-6 text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-soft"
        >
          {busy ? "Sending…" : "Submit feedback"}
        </button>
      </div>
    </form>
  );
}
