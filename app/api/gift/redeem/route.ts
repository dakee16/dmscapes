import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import { redeemGift } from "@/lib/gift-codes";

export const runtime = "nodejs";

/** Redeem a gift code (lib/gift-codes.ts): its plan and credits go to the signed-in account, once. */
export async function POST(request: Request) {
  const rl = rateLimit(request, "gift-redeem", 20, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many tries. Give it a few minutes." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in or sign up to redeem your gift." }, { status: 401 });
  // Per account too, not just per address. Codes are 80 random bits, so this is about mistakes, not guessing.
  const mine = rateLimit(request, `gift-redeem:${userId}`, 10, 60 * 60 * 1000);
  if (!mine.allowed) {
    return NextResponse.json({ error: "Too many tries. Give it a while, then check the code against your email." }, { status: 429, headers: { "Retry-After": String(mine.retryAfterSec) } });
  }
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: "Gifts aren't available right now." }, { status: 503 });
  const body = (await request.json().catch(() => null)) as { code?: unknown } | null;
  try {
    const result = await redeemGift(db, userId, body?.code);
    return result.ok
      ? NextResponse.json({ ok: true, plan: result.plan, credits: result.credits })
      : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (error) {
    console.error("gift redeem failed:", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Couldn't redeem your gift right now. Try again in a minute." }, { status: 503 });
  }
}
