import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";

// Uses the service client + a SECURITY DEFINER RPC; keep on the Node runtime.
export const runtime = "nodejs";

/**
 * Spend one plan-generation credit for the signed-in user, called when they
 * generate a new room plan. Free and Pro never consume (unlimited); a Plus user
 * with no credits left is blocked. The decrement is atomic in Postgres
 * (consume_plan_credit), so it can't be double-spent.
 *
 * Responses:
 *   { blocked: false, remaining: number | null }  allowed (remaining is the new
 *                                                  Plus balance, or null for
 *                                                  free/pro/unmetered)
 *   { blocked: true }                              Plus user out of credits
 */
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
    // Logged-out planning is free/unlimited; nothing to consume.
    return NextResponse.json({ blocked: false, remaining: null });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    // Degrade open: never block planning because billing infra is down.
    return NextResponse.json({ blocked: false, remaining: null });
  }

  const { data, error } = await supabase.rpc("consume_plan_credit", {
    p_user_id: userId,
  });
  if (error) {
    console.error("plan consume rpc failed:", error.message);
    return NextResponse.json({ blocked: false, remaining: null });
  }

  const result = typeof data === "number" ? data : Number(data);
  if (result < 0) {
    return NextResponse.json({ blocked: true });
  }
  // The RPC returns INT_MAX for free/pro/unmetered; surface that as null.
  const remaining = result >= 2147483647 ? null : result;
  return NextResponse.json({ blocked: false, remaining });
}
