import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { sameOrigin } from "@/lib/request-body";
import { rateLimit } from "@/lib/rate-limit";
import { getUserId } from "@/lib/supabase-auth";
import { MAX_BYTES, MAX_PAGES, sniff, type ReadFailure } from "@/lib/schedule-file";
import { DEFAULT_MODEL, pdfPages, readSchedule } from "@/lib/schedule-read";

export const runtime = "nodejs";
export const maxDuration = 45;

const HOUR = 60 * 60 * 1000;
const reply = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store", ...headers } });
const fail = (reason: ReadFailure, status: number, headers?: Record<string, string>) => reply({ error: reason }, status, headers);
/** Counts and outcomes only: never the file, its text or what was read from it. */
const log = (fields: Record<string, unknown>) => console.info(JSON.stringify({ event: "hall_finder_parse", ...fields }));

/**
 * POST multipart { file } -> { classes } read from a schedule screenshot or PDF
 * (design-handoff/hall-finder plan.md, Schedule upload). Signed-in accounts only: each
 * read is a paid model call. The file is read into memory, sent to Claude once and
 * dropped; matching the locations to buildings happens in the browser, on the same
 * confirm screen .ics uses.
 */
export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Cross-origin requests aren't allowed." }, 403);
  // Rate limits are per server instance (lib/rate-limit): a cold start or a second
  // instance starts its own counts. Fine for stopping one account or bot hammering this.
  const ip = rateLimit(request, "hf-parse-ip", 30, HOUR);
  if (!ip.allowed) return fail("rate_limited", 429, { "Retry-After": String(ip.retryAfterSec) });

  const devUser = process.env.NODE_ENV !== "production" && request.headers.get("x-dormscape-dev-plan") ? "dev-mock" : null;
  const userId = (await getUserId(request)) ?? devUser;
  if (!userId) return reply({ error: "signed_out" }, 401);

  if (Number(request.headers.get("content-length")) > MAX_BYTES + 64 * 1024) return fail("too_large", 413);
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return fail("wrong_type", 400);
  if (file.size > MAX_BYTES) return fail("too_large", 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes.subarray(0, 8));
  if (!kind) return fail("wrong_type", 415);
  const pages = kind === "pdf" ? pdfPages(bytes) : null;
  if (kind === "pdf" && (pages === null || pages > MAX_PAGES)) return fail(pages === null ? "unreadable" : "too_many_pages", 422);

  // Counted only for files that would reach the model.
  for (const [bucket, limit, windowMs] of [["hf-parse-hour", 5, HOUR], ["hf-parse-day", 15, 24 * HOUR]] as const) {
    const rl = rateLimit(request, bucket, limit, windowMs, userId);
    if (!rl.allowed) {
      log({ outcome: "rate_limited", bucket });
      return fail("rate_limited", 429, { "Retry-After": String(rl.retryAfterSec) });
    }
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return fail("unavailable", 503);
  const started = Date.now();
  try {
    const result = await readSchedule(new Anthropic({ apiKey: key }), process.env.HALL_FINDER_MODEL || DEFAULT_MODEL, kind, bytes);
    const ms = Date.now() - started;
    if (!result.ok) {
      log({ outcome: result.reason, kind, bytes: bytes.length, pages, ms });
      return result.reason === "busy" ? fail("unavailable", 503) : fail(result.reason, 422);
    }
    log({ outcome: "ok", kind, bytes: bytes.length, pages, classes: result.classes.length, ms, tokens: result.usage });
    return reply({ classes: result.classes });
  } catch (err) {
    log({ outcome: "error", kind, status: err instanceof Anthropic.APIError ? err.status : null, type: err instanceof Error ? err.name : "unknown" });
    return fail("unavailable", 502);
  }
}
