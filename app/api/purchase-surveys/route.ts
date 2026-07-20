import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import type {
  PurchaseSurveyRequest,
  PurchaseSurveyResponse,
} from "@/lib/api-types";

// Survey logging is best-effort from the UI's perspective (the prompt must
// never break on a bad network), but this is an important analytics asset, so
// we validate strictly and log DB failures loudly.

const RESPONSES: PurchaseSurveyResponse[] = ["yes", "still_deciding", "no"];
const STYLE_IDS = ["minimalist", "cozy", "gamer", "boho", "preppy"];

function cleanId(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Whitelist the design snapshot so arbitrary JSON never lands in the DB. */
function sanitizeSnapshot(input: unknown): Record<string, unknown> | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const s = input as Record<string, unknown>;
  const dimsIn = s.room_dimensions;
  let dims: Record<string, unknown> | null = null;
  if (dimsIn && typeof dimsIn === "object" && !Array.isArray(dimsIn)) {
    const d = dimsIn as Record<string, unknown>;
    dims = {
      length_ft: num(d.length_ft),
      width_ft: num(d.width_ft),
      room_type: cleanId(d.room_type, 60),
      occupants: num(d.occupants),
    };
  }
  const style = typeof s.style === "string" && STYLE_IDS.includes(s.style) ? s.style : null;
  return {
    college_id: cleanId(s.college_id, 80),
    dorm_id: cleanId(s.dorm_id, 80),
    style,
    budget: num(s.budget),
    room_dimensions: dims,
  };
}

export async function POST(request: Request) {
  let body: PurchaseSurveyRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sessionId = cleanId(body.session_id, 64);
  const response = RESPONSES.includes(body.response as PurchaseSurveyResponse)
    ? (body.response as PurchaseSurveyResponse)
    : null;
  if (!sessionId || !response) {
    return NextResponse.json(
      { error: "session_id and a valid response are required." },
      { status: 400 }
    );
  }

  const userId = cleanId(body.user_id, 64);
  const savedRoomId = cleanId(body.saved_room_id, 40);
  const cartTotal =
    typeof body.cart_total === "number" && Number.isFinite(body.cart_total)
      ? body.cart_total
      : null;
  const snapshot =
    body.room_snapshot != null ? sanitizeSnapshot(body.room_snapshot) : null;

  const supabase = getServiceClient();
  if (!supabase) {
    // Unconfigured env: accept and no-op so the prompt still works locally.
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const { error } = await supabase.from("purchase_surveys").insert({
    session_id: sessionId,
    user_id: userId,
    response,
    saved_room_id: savedRoomId,
    room_snapshot: snapshot,
    cart_total: cartTotal,
  });
  if (error) console.error("purchase_surveys insert failed:", error.message);

  return NextResponse.json({ ok: true }, { status: 201 });
}
