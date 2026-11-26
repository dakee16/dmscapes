// SERVER ONLY: callers supply the service-role client. Gift codes (docs/migrations/20261125_gift_codes.sql):
// the Stripe webhook makes one per paid gift checkout and emails it to the recipient; redemption grants
// the plan to whoever redeems it, once. Shared rules and formatting live in lib/gift.ts.
import { createHash, createHmac } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { grantPurchasedPlan } from "./credit-ledger";
import { sendEmail } from "./email";
import { giftEmail } from "./email-templates";
import { formatGiftCode, giftRedeemUrl, GIFT_CODE_ALPHABET, normalizeGiftCode, type GiftDetails, type GiftPlan } from "./gift";

export const hashGiftCode = (code: string): string => createHash("sha256").update(code).digest("hex");

/**
 * The gift code for a paid checkout session: 80 bits of an HMAC of the session id under the webhook's
 * signing secret, in Crockford base32. Unguessable without the secret, and the same on every retry, so a
 * failed email can be sent again without the database ever holding the code itself (only its hash).
 */
export function giftCodeFor(sessionId: string, secret = process.env.STRIPE_WEBHOOK_SECRET): string {
  if (!secret) throw new Error("No secret to make gift codes with.");
  const bytes = createHmac("sha256", secret).update(`dormscape-gift-code:v1:${sessionId}`).digest();
  let code = "";
  let value = 0;
  let bits = 0;
  for (const byte of bytes.subarray(0, 10)) {
    value = ((value << 8) | byte) & 0xfff;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      code += GIFT_CODE_ALPHABET[(value >> bits) & 31];
    }
  }
  return code;
}

const keyFor = (code: string) => ({ code_hash: hashGiftCode(code), code_hint: code.slice(-4) });

/** Records the gift for a paid session. Already there (a retried event) is fine. */
export async function createGift(db: SupabaseClient, gift: {
  sessionId: string; paymentIntent: string | null; buyerId: string; plan: GiftPlan; credits: number; details: GiftDetails;
}): Promise<void> {
  const { error } = await db.from("gift_codes").insert({
    ...keyFor(giftCodeFor(gift.sessionId)),
    plan: gift.plan,
    credits: gift.credits,
    buyer_id: gift.buyerId,
    recipient_email: gift.details.to,
    message: gift.details.message,
    sender_name: gift.details.from,
    stripe_session_id: gift.sessionId,
    payment_intent: gift.paymentIntent,
  });
  if (error && error.code !== "23505") throw new Error(`Could not record the gift: ${error.message}`);
}

const SITE = () => process.env.NEXT_PUBLIC_SITE_URL || "https://dormscape.us";

/**
 * Emails the recipient their code, once. Throws when the email isn't accepted, so the webhook answers
 * 503 and Stripe sends the event again: the code is derived, never lost, and Resend's idempotency key
 * keeps a retry from sending it twice. Nothing goes out for a gift that was taken back or already used.
 */
export async function deliverGift(db: SupabaseClient, sessionId: string): Promise<void> {
  const { data: row, error } = await db
    .from("gift_codes")
    .select("id, code_hash, plan, credits, recipient_email, message, sender_name, emailed_at, redeemed_at, voided_at")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error || !row) throw new Error("Could not load the gift.");
  if (row.emailed_at || row.redeemed_at || row.voided_at) return;
  const code = giftCodeFor(sessionId);
  const key = keyFor(code);
  if (row.code_hash !== key.code_hash) {
    // The signing secret changed before the first email went out: the unsent code is remade under the new one.
    const { data, error: rekeyError } = await db.from("gift_codes").update(key).eq("id", row.id).is("emailed_at", null).is("redeemed_at", null).select("id").maybeSingle();
    if (rekeyError || !data) throw new Error("Could not update the gift code.");
  }
  const sent = await sendEmail({
    to: row.recipient_email,
    ...giftEmail({ plan: row.plan, credits: row.credits, from: row.sender_name, message: row.message, code: formatGiftCode(code), url: giftRedeemUrl(SITE(), code) }),
    idempotencyKey: `gift-code/${row.id}/${key.code_hash.slice(0, 12)}`,
  });
  if (!sent) throw new Error("The gift email was not accepted.");
  const { error: markError } = await db.from("gift_codes").update({ emailed_at: new Date().toISOString() }).eq("id", row.id);
  if (markError) throw new Error("Could not record the gift email.");
}

export type GiftRedeemResult = { ok: true; plan: GiftPlan; credits: number } | { ok: false; status: number; error: string };

/**
 * Redeems a code for the signed-in account: one conditional update claims it (only while unredeemed and
 * not voided, so two redeems racing get exactly one success), then the plan and credits are granted.
 * Pro never drops to Plus (grantPurchasedPlan). Anyone signed in may redeem, the buyer included: the code
 * is what was paid for, and the purchase itself never grants anything.
 * ponytail: claim and grant are two steps; a refund landing in the milliseconds between them takes back
 * before the grant arrives. A SQL function doing both in one transaction if that ever matters.
 */
export async function redeemGift(db: SupabaseClient, userId: string, raw: unknown): Promise<GiftRedeemResult> {
  const code = normalizeGiftCode(raw);
  if (!code) return { ok: false, status: 400, error: "That code doesn't look right. It's 16 letters and numbers, like ABCD-EFGH-JKMN-PQRS." };
  const hash = hashGiftCode(code);
  const { data: claimed, error } = await db
    .from("gift_codes")
    .update({ redeemed_by: userId, redeemed_at: new Date().toISOString() })
    .eq("code_hash", hash)
    .is("redeemed_at", null)
    .is("voided_at", null)
    .select("id, plan, credits")
    .maybeSingle();
  if (error) return { ok: false, status: 503, error: "Gifts aren't available right now. Try again in a minute." };
  if (!claimed) {
    const { data: found } = await db.from("gift_codes").select("redeemed_by, redeemed_at, voided_at").eq("code_hash", hash).maybeSingle();
    if (!found) return { ok: false, status: 404, error: "We couldn't find that gift code. Check it against your gift email and try again." };
    if (found.redeemed_at && found.redeemed_by === userId) return { ok: false, status: 409, error: "You've already redeemed this gift. It's on your account." };
    if (found.redeemed_at) return { ok: false, status: 409, error: "This gift has already been redeemed. Each code works once." };
    return { ok: false, status: 410, error: "This gift was cancelled, so its code no longer works. If that seems wrong, contact us." };
  }
  try {
    await grantPurchasedPlan(db, userId, claimed.plan, claimed.credits, null, false);
  } catch (grantError) {
    // Give the code back so the next try can use it.
    await db.from("gift_codes").update({ redeemed_by: null, redeemed_at: null }).eq("id", claimed.id).eq("redeemed_by", userId);
    throw grantError;
  }
  return { ok: true, plan: claimed.plan, credits: claimed.credits };
}
