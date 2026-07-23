// SERVER-ONLY. Lightweight in-memory rate limiter for the public API routes.
//
// Fixed-window counting keyed by `${bucket}:${ip}`. Zero dependencies, zero
// paid infrastructure. Known limitation: on serverless hosting each warm
// instance keeps its own counters (a cold start resets them, and parallel
// instances don't share state), so the enforced ceiling is per-instance, not
// global. That still stops the realistic abuse case here — one bot hammering
// one endpoint — because repeated requests from the same client land on the
// same warm instance far more often than not. If traffic ever justifies a
// hard global limit, swap the Map for Upstash Redis / Vercel KV behind the
// same function signature.

interface Window {
  count: number;
  resetAt: number;
}

const windows = new Map<string, Window>();

/** Purge expired windows so the map can't grow unbounded under churn. */
function sweep(now: number): void {
  if (windows.size < 5000) return;
  for (const [key, w] of windows) {
    if (w.resetAt <= now) windows.delete(key);
  }
}

/**
 * Best-effort client IP. On Vercel (and most proxies) x-forwarded-for is set
 * by the platform with the client address first. Clients that arrive with no
 * forwarding headers share one "unknown" bucket, which only ever errs on the
 * side of stricter limiting.
 */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Count a hit against `${bucket}:${ip}` and report whether it's allowed.
 * `limit` requests per `windowMs` rolling into fixed windows.
 */
export function rateLimit(
  request: Request,
  bucket: string,
  limit: number,
  windowMs: number
): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  sweep(now);
  const key = `${bucket}:${clientIp(request)}`;
  const w = windows.get(key);
  if (!w || w.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }
  w.count += 1;
  return {
    allowed: w.count <= limit,
    retryAfterSec: Math.max(1, Math.ceil((w.resetAt - now) / 1000)),
  };
}
