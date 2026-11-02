import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import { redeemCreatorCode } from "@/lib/creator-codes";

export const runtime = "nodejs";

/** Redeem a creator code: Plus, free, once per account. */
export async function POST(request: Request) {
  const rl = rateLimit(request, "creator-code", 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many tries. Give it a few minutes." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to use a creator code." }, { status: 401 });
  // Per account too, not just per address: guessing codes from one account stays slow.
  const mine = rateLimit(request, `creator-code:${userId}`, 5, 60 * 60 * 1000);
  if (!mine.allowed) {
    return NextResponse.json({ error: "Too many tries. Give it a while." }, { status: 429, headers: { "Retry-After": String(mine.retryAfterSec) } });
  }
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: "Creator codes aren't available right now." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  try {
    const result = await redeemCreatorCode(db, userId, body?.code);
    return result.ok ? NextResponse.json({ ok: true }) : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) {
    console.error("creator code failed:", error);
    return NextResponse.json({ error: "Couldn't unlock Plus right now. Try again in a minute." }, { status: 503 });
  }
}
