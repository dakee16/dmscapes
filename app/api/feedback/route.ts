import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import type { FeedbackRequest } from "@/lib/api-types";

// Confirmation-page feedback (purchase_feedback table). Rating is required;
// the write-up is optional. Validated strictly, logged loudly on DB failure.

function cleanId(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

export async function POST(request: Request) {
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

  const userId = cleanId(body.user_id, 64);
  const surveyId = cleanId(body.purchase_survey_id, 64);
  const text =
    typeof body.feedback_text === "string" && body.feedback_text.trim()
      ? body.feedback_text.trim().slice(0, 2000)
      : null;

  const supabase = getServiceClient();
  if (!supabase) {
    // Unconfigured env: accept and no-op so the page still works locally.
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const { error } = await supabase.from("purchase_feedback").insert({
    session_id: sessionId,
    user_id: userId,
    purchase_survey_id: surveyId,
    rating,
    feedback_text: text,
  });
  if (error) {
    console.error("purchase_feedback insert failed:", error.message);
    // Foreign-key or table-missing failures shouldn't surface to the user;
    // the UI treats feedback as fire-and-forget.
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
