import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import type { ProductClickRequest } from "@/lib/api-types";

// Click logging is best-effort: the buy button must never break because
// analytics hiccuped, so everything after basic validation returns 202.

function cleanId(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed && trimmed.length <= max ? trimmed : null;
}

export async function POST(request: Request) {
  let body: ProductClickRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const sessionId = cleanId(body.session_id, 64);
  const productId = cleanId(body.product_id, 64);
  if (!sessionId || !productId) {
    return NextResponse.json(
      { error: "session_id and product_id are required." },
      { status: 400 }
    );
  }

  const price =
    typeof body.product_price === "number" && Number.isFinite(body.product_price)
      ? body.product_price
      : null;
  const affiliateUrl =
    typeof body.affiliate_url === "string" &&
    body.affiliate_url.startsWith("https://www.amazon.com/")
      ? body.affiliate_url.slice(0, 500)
      : null;

  const supabase = getServiceClient();
  if (!supabase) {
    // Unconfigured env: swallow silently — clicks are fire-and-forget.
    return NextResponse.json({ ok: true }, { status: 202 });
  }

  const { error } = await supabase.from("product_clicks").insert({
    session_id: sessionId,
    product_id: productId,
    product_price: price,
    affiliate_url: affiliateUrl,
  });
  if (error) console.error("product_clicks insert failed:", error.message);

  return NextResponse.json({ ok: true }, { status: 202 });
}
