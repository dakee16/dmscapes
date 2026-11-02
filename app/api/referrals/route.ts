import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import { invitedBy, referralCode, referralStats } from "@/lib/referrals";

export const runtime = "nodejs";

/** The signed-in user's invite link, how many friends it has brought in, and who invited them. */
export async function GET(request: Request) {
  const rl = rateLimit(request, "referrals", 60, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many requests. Give it a minute." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to get your invite link." }, { status: 401 });
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: "Invites aren't available right now." }, { status: 503 });
  try {
    const [code, stats, by] = await Promise.all([referralCode(db, userId), referralStats(db, userId), invitedBy(db, userId)]);
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
    return NextResponse.json({ code, url: `${origin}/?ref=${code}`, ...stats, invitedBy: by });
  } catch (error) {
    console.error("referral link failed:", error);
    return NextResponse.json({ error: "Invites aren't switched on yet. Check back soon." }, { status: 503 });
  }
}
