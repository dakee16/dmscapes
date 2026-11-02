import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import { claimReferral, type ReferralSource } from "@/lib/referrals";

export const runtime = "nodejs";

/** After sign-in: record who invited this new account (an invite code or a shared room). */
export async function POST(request: Request) {
  const rl = rateLimit(request, "referral-claim", 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Give it a minute." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: "Invites aren't available right now." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as ReferralSource | null;
  try {
    return NextResponse.json({ claimed: await claimReferral(db, userId, body ?? {}) });
  } catch (error) {
    console.error("referral claim failed:", error);
    return NextResponse.json({ error: "Couldn't record the invite." }, { status: 503 });
  }
}
