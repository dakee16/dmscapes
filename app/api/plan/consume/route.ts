import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import { spendPlanCredit } from "@/lib/credit-ledger";

// Credit updates use the server-only service client.
export const runtime = "nodejs";

/** Spend one generation credit. Every tier has a finite balance. */
export async function POST(request: Request) {
  const rl = rateLimit(request, "plan-consume", 60, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Give it a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Sign in to generate a room plan." }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: "Credit checks are unavailable. Please try again." }, { status: 503 });
  }

  try {
    return NextResponse.json(await spendPlanCredit(supabase, userId));
  } catch (error) {
    console.error("plan credit check failed:", error);
    return NextResponse.json({ error: "Could not check your credits. Please try again." }, { status: 503 });
  }
}
