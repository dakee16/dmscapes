// SERVER-ONLY. Signed one-click unsubscribe links for marketing email (RFC 8058).
// A link carries the user id and an HMAC over it, so it works without a login
// and can't be forged for someone else. The key is derived from
// SUPABASE_SERVICE_ROLE_KEY (no extra secret to manage); rotating that key
// invalidates links in emails already sent.
// Imported by the unsubscribe page and route, and by scripts/send-campaign.mjs
// (Node's type stripping), so it must stay free of imports other than node:.
import { createHmac, timingSafeEqual } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{43}$/; // base64url of a SHA-256 HMAC

export const SITE = "https://dormscape.us";

function key(): Buffer | null {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return secret ? createHmac("sha256", secret).update("dormscape-unsubscribe-v1").digest() : null;
}

/** Whether u and t have the shape of a user id and a token (not whether they match). */
export function wellFormed(u: unknown, t: unknown): u is string {
  return typeof u === "string" && typeof t === "string" && UUID.test(u) && TOKEN.test(t);
}

export function unsubscribeToken(userId: string): string {
  const k = key();
  if (!k) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createHmac("sha256", k).update(`marketing:${userId.toLowerCase()}`).digest("base64url");
}

export function verifyUnsubscribeToken(userId: unknown, token: unknown): boolean {
  if (!wellFormed(userId, token) || !key()) return false;
  const expected = Buffer.from(unsubscribeToken(userId));
  const given = Buffer.from(token as string);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

/** page: the confirm page linked in the email body (GET never unsubscribes).
 *  oneClick: the List-Unsubscribe header URL, which mail clients POST to. */
export function unsubscribeUrls(userId: string) {
  const query = new URLSearchParams({ u: userId, t: unsubscribeToken(userId) });
  return { page: `${SITE}/unsubscribe?${query}`, oneClick: `${SITE}/api/unsubscribe?${query}` };
}
