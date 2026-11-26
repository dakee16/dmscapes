import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getServiceClient } from "@/lib/supabase-server";
import { verifyUnsubscribeToken, wellFormed } from "@/lib/unsubscribe";

// Marketing-email unsubscribe (links from lib/unsubscribe.ts). No login: the
// signed token is the authorization. The email body links to /unsubscribe; this
// URL is the List-Unsubscribe header's.

function linkParams(request: Request) {
  const query = new URL(request.url).searchParams;
  return { u: query.get("u") ?? "", t: query.get("t") ?? "" };
}

/** A mail client or person opening the header link lands on the confirm page.
 *  GET never unsubscribes, so link scanners and prefetches change nothing. */
export function GET(request: Request) {
  const { u, t } = linkParams(request);
  return NextResponse.redirect(new URL(`/unsubscribe?${new URLSearchParams({ u, t })}`, request.url), 303);
}

/** RFC 8058 one-click (the mail client POSTs List-Unsubscribe=One-Click; the body
 *  isn't needed) and the confirm page's button. A well-formed request gets 200
 *  whether or not the token matches, so tokens can't be probed. */
export async function POST(request: Request) {
  const rl = rateLimit(request, "unsubscribe", 30, 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Give it a minute and try again." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }
  const { u, t } = linkParams(request);
  if (!wellFormed(u, t)) return NextResponse.json({ error: "This unsubscribe link is incomplete." }, { status: 400 });

  if (verifyUnsubscribeToken(u, t)) {
    const db = getServiceClient();
    const { error } = db
      ? await db.from("profiles").update({ marketing_opt_in_at: null }).eq("id", u.toLowerCase())
      : { error: { message: "Supabase is not configured." } };
    // Never say someone is unsubscribed when they aren't: a failed write asks
    // the page (or the mail client) to try again.
    if (error) {
      console.error("unsubscribe failed:", error.message);
      return NextResponse.json({ error: "Couldn't save that. Try again in a minute." }, { status: 503 });
    }
  }
  return NextResponse.json({ ok: true });
}
