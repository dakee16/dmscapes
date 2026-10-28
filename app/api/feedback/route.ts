import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import type { FeedbackRequest } from "@/lib/api-types";

// Confirmation-page feedback (purchase_feedback table). Rating is required;
// the write-up is optional. Validated strictly, logged loudly on DB failure.

function cleanId(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

export async function POST(request: Request) {
  const rl = rateLimit(request, "feedback", 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Give it a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: FeedbackRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sessionId = cleanId(body.session_id, 64);
  const rating =
    typeof body.rating === "number" && Number.isInteger(body.rating)
      ? body.rating
      : null;
  if (!sessionId || rating === null || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "session_id and a 1-5 rating are required." },
      { status: 400 }
    );
  }

  // User attribution comes from the verified bearer token, never the body:
  // a request can't claim to be someone else.
  const userId = await getUserId(request);
  const surveyId = cleanId(body.purchase_survey_id, 64);
  const text =
    typeof body.feedback_text === "string" && body.feedback_text.trim()
      ? body.feedback_text.trim().slice(0, 2000)
      : null;

  // An opt-in public review needs words and a name to show; it's published only
  // after the owner sets approved_at (lib/reviews).
  const displayName = typeof body.display_name === "string" ? body.display_name.trim().slice(0, 40) : "";
  const schoolName = typeof body.school_name === "string" ? body.school_name.trim().slice(0, 80) : "";
  const review =
    body.public_ok === true && text && displayName
      ? { public_ok: true, display_name: displayName, school_name: schoolName || null }
      : null;

  const supabase = getServiceClient();
  if (!supabase) {
    // Unconfigured env: accept and no-op so the page still works locally.
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const row = { session_id: sessionId, user_id: userId, purchase_survey_id: surveyId, rating, feedback_text: text };
  let { error } = await supabase.from("purchase_feedback").insert(review ? { ...row, ...review } : row);
  if (error && review) {
    // The review columns arrive with docs/migrations/20261028_public_reviews.sql; until it's
    // applied, keep the rating rather than lose it.
    console.error("purchase_feedback review insert failed, retrying without review fields:", error.message);
    ({ error } = await supabase.from("purchase_feedback").insert(row));
  }
  if (error) {
    console.error("purchase_feedback insert failed:", error.message);
    // Foreign-key or table-missing failures shouldn't surface to the user;
    // the UI treats feedback as fire-and-forget.
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
