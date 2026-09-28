import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { rateLimit } from "@/lib/rate-limit";
import { boundedJson, sameOrigin } from "@/lib/request-body";
import { hasRecentSignIn } from "@/lib/account-deletion";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const reply = (body: object, status: number) => NextResponse.json(body, { status, headers });

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Open account settings on Dormscape to continue." }, 403);
  const token = request.headers.get("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) return reply({ error: "Sign in to delete your account." }, 401);
  const limit = rateLimit(request, "account-deletion", 5, 10 * 60 * 1000);
  if (!limit.allowed) return NextResponse.json({ error: "Too many attempts. Please try again later." }, {
    status: 429, headers: { ...headers, "Retry-After": String(limit.retryAfterSec) },
  });
  const db = getServiceClient();
  if (!db) return reply({ error: "Account deletion is unavailable here. Contact info@dormscape.us for help." }, 503);
  const body = await boundedJson(request, 1024);
  if (body?.confirmation !== "DELETE" || body.acknowledged !== true) {
    return reply({ error: "Type DELETE and confirm that you understand what will be removed." }, 400);
  }
  try {
    const { data, error } = await db.auth.getUser(token);
    if (error || !data.user || data.user.is_anonymous) return reply({ error: "Sign in again to continue." }, 401);
    if (!hasRecentSignIn(token)) return reply({ code: "REAUTH_REQUIRED", error: "For your security, sign in again, then return here to confirm deletion within 10 minutes." }, 401);

    // Never delete an auth account unless its transactional data cleanup exists.
    const ready = await db.rpc("dormscape_account_deletion_ready");
    if (ready.error || ready.data !== true) return reply({ error: "Account deletion is not set up in this environment yet. Contact info@dormscape.us for help." }, 503);
    // No user id is accepted from the body. Supabase deletes the auth identity,
    // sessions and app data in one transaction using the installed trigger.
    const deleted = await db.auth.admin.deleteUser(data.user.id, false);
    if (deleted.error) {
      console.error("account deletion failed", deleted.error.code ?? deleted.error.status);
      return reply({ error: "Your account could not be deleted. Please try again or contact info@dormscape.us." }, 500);
    }
    return reply({ ok: true }, 200);
  } catch {
    return reply({ error: "We couldn't confirm the deletion. Please check your connection and sign in again before retrying." }, 500);
  }
}
