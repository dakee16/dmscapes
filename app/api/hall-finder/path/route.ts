import { NextResponse } from "next/server";
import { boundedJson, sameOrigin } from "@/lib/request-body";
import { rateLimit } from "@/lib/rate-limit";
import { parseRankRequest, pathsFor, rank, viewerTier } from "@/lib/hall-finder-server";

export const runtime = "nodejs";

const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", ...headers } });

/**
 * POST { collegeId, dormId, places, filters } -> { dormId, paths: [encoded polyline | null per place] }.
 * A free account only gets the hall that ranks #1 for the places it sends (re-ranked here);
 * Plus and Pro get any hall.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Cross-origin requests aren't allowed." }, 403);
  const rl = rateLimit(request, "hall-finder-path", 120, 10 * 60 * 1000);
  if (!rl.allowed) return reply({ error: "Too many requests. Give it a minute." }, 429, { "Retry-After": String(rl.retryAfterSec) });

  const body = await boundedJson(request);
  const parsed = await parseRankRequest(body);
  const dormId = typeof body?.dormId === "string" ? body.dormId : "";
  if (!parsed || !parsed.data.minutes.halls[dormId]) return reply({ error: "That hall or those places couldn't be read." }, 400);

  const tier = await viewerTier(request);
  if (tier === "anon") return reply({ error: "Sign in to see walking routes." }, 401);
  if (tier === "free" && rank(parsed.data, parsed.req)[0]?.dormId !== dormId) {
    return reply({ error: "Routes for every hall come with Plus." }, 403);
  }
  const paths = await pathsFor(parsed.data, dormId, parsed.req.places);
  if (!paths) return reply({ error: "No routes for that hall yet." }, 404);
  return reply({ dormId, paths });
}
