import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import type { RoomSubmissionRequest, RoomSubmissionResponse } from "@/lib/api-types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

function clampFeet(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return Math.min(60, Math.max(4, value));
}

export async function POST(request: Request) {
  const rl = rateLimit(request, "room-submissions", 5, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Give it a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: RoomSubmissionRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Honeypot: humans never see this field; bots that fill it get a quiet
  // success with no insert.
  if (typeof body.website === "string" && body.website.trim()) {
    return NextResponse.json({ ok: true } satisfies RoomSubmissionResponse);
  }

  const collegeName = cleanText(body.college_name, 120);
  if (!collegeName) {
    return NextResponse.json(
      { error: "Tell us your college's name." },
      { status: 400 }
    );
  }

  const email = cleanText(body.email, 254)?.toLowerCase() ?? null;
  if (email && !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Submissions aren't open yet. Check back soon." },
      { status: 503 }
    );
  }

  const { error } = await supabase.from("room_submissions").insert({
    college_name: collegeName,
    // Schema requires dorm_name; the request-school modal only collects
    // college + email, so default rather than relax the table.
    dorm_name: cleanText(body.dorm_name, 120) ?? "unknown",
    room_type: cleanText(body.room_type, 60),
    length_ft: clampFeet(body.length_ft),
    width_ft: clampFeet(body.width_ft),
    email,
    notes: cleanText(body.notes, 1000),
  });

  if (error) {
    console.error("room_submissions insert failed:", error.message);
    return NextResponse.json(
      { error: "Couldn't save your submission. Try again in a minute." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true } satisfies RoomSubmissionResponse);
}
