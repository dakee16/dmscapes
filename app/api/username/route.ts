import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import type { UsernameCheckResponse } from "@/lib/api-types";

const USERNAME_RE = /^[A-Za-z0-9._]{3,20}$/;

/**
 * Pre-flight username availability check. Advisory only; the unique index
 * in 0002_profiles.sql is the real gate against races.
 */
export async function GET(request: Request) {
  // Debounced typing tops out well under this; blocks bulk enumeration.
  const rl = rateLimit(request, "username", 40, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ available: null } satisfies UsernameCheckResponse, {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSec) },
    });
  }

  const u = new URL(request.url).searchParams.get("u") ?? "";
  if (!USERNAME_RE.test(u)) {
    return NextResponse.json(
      {
        available: false,
        error: "3–20 characters; letters, numbers, underscore, period.",
      } satisfies UsernameCheckResponse,
      { status: 400 }
    );
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ available: null } satisfies UsernameCheckResponse);
  }

  // Escape LIKE wildcards; usernames may contain "_".
  const escaped = u.replace(/([\\%_])/g, "\\$1");
  const { data, error } = await supabase
    .from("profiles")
    .select("id")
    .ilike("username", escaped)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("username check failed:", error.message);
    return NextResponse.json({ available: null } satisfies UsernameCheckResponse);
  }

  return NextResponse.json({ available: !data } satisfies UsernameCheckResponse);
}
