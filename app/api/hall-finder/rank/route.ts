import { NextResponse } from "next/server";
import { boundedJson, sameOrigin } from "@/lib/request-body";
import { rateLimit } from "@/lib/rate-limit";
import { parseRankRequest, rank, viewerTier } from "@/lib/hall-finder-server";

export const runtime = "nodejs";

const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", ...headers } });

/**
 * POST { collegeId, places: [{ placeId | pin, days }], filters } -> halls ranked by weekly walk.
 * The answer depends on who's asking (plan.md Gating): signed out gets the hall count
 * for the gate; a free account gets the #1 hall in full and only the weekly gap for the
 * rest, with no ids or names; Plus and Pro get the full ranking.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Cross-origin requests aren't allowed." }, 403);
  const rl = rateLimit(request, "hall-finder-rank", 120, 10 * 60 * 1000);
  if (!rl.allowed) return reply({ error: "Too many requests. Give it a minute." }, 429, { "Retry-After": String(rl.retryAfterSec) });

  const parsed = await parseRankRequest(await boundedJson(request));
  if (!parsed) return reply({ error: "Those places couldn't be read." }, 400);
  const ranked = rank(parsed.data, parsed.req);
  const tier = await viewerTier(request);

  if (tier === "anon") return reply({ tier, count: ranked.length });
  if (tier === "free") {
    const [top, ...rest] = ranked;
    return reply({ tier, count: ranked.length, top: top ?? null, others: rest.map((r) => Math.round((r.weekly - top.weekly) * 10) / 10) });
  }
  return reply({ tier, count: ranked.length, ranked });
}
