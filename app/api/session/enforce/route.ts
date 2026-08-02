import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import { MAX_CONCURRENT_SESSIONS } from "@/lib/session-limit";

// Called by the client right after a sign-in. Revokes the caller's oldest
// sessions beyond MAX_CONCURRENT_SESSIONS so an account can't stay signed in on
// an unlimited number of devices (a Plus-sharing deterrent). See
// supabase/migrations/0009_session_limit.sql for the enforcement itself.
//
// Degrades safely: if Supabase isn't configured or the migration hasn't been
// applied yet, the RPC errors and we return { bumped: 0 } so nothing breaks and
// no one is signed out. Enforcement simply turns on once the migration lands.
export async function POST(request: Request) {
  const rl = rateLimit(request, "session-enforce", 30, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Give it a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ bumped: 0 }, { status: 200 });
  }

  const { data, error } = await supabase.rpc("enforce_session_limit", {
    p_user_id: userId,
    p_keep: MAX_CONCURRENT_SESSIONS,
  });

  if (error) {
    // Most likely cause before the migration is applied: function not found.
    console.error("enforce_session_limit failed:", error.message);
    return NextResponse.json({ bumped: 0 }, { status: 200 });
  }

  return NextResponse.json(
    { bumped: typeof data === "number" ? data : 0 },
    { status: 200 }
  );
}
