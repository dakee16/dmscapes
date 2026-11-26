// Gift a plan: someone buys Plus or Pro for someone else (owner decisions, Nov 2026: the regular
// price, the recipient gets the gift email and the buyer the usual invoice, no expiry). Shared by
// the /gift pages, checkout, the webhook and redemption, so it imports nothing server-only.
// The server side (codes, database, email) is lib/gift-codes.ts.

export type GiftPlan = "plus" | "pro";
export type GiftDetails = { to: string; from: string | null; message: string | null };
export type GiftStatus = "sending" | "sent" | "redeemed" | "voided" | "refunded";

export const GIFT_MESSAGE_MAX = 300;
export const GIFT_NAME_MAX = 60;
const EMAIL_MAX = 254;

/** gift_plus → "plus", gift_pro → "pro", anything else → null. */
export function giftPlanOf(purchase: unknown): GiftPlan | null {
  return purchase === "gift_plus" ? "plus" : purchase === "gift_pro" ? "pro" : null;
}

// The HTML form's email rule (no spaces, commas, quotes or angle brackets), with a real top-level domain.
const EMAIL = /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,63}$/;
// Control characters, zero-width and bidirectional overrides; a tab and a new line stay.
const HIDDEN = new RegExp(
  `[${[[0x00, 0x08], [0x0b, 0x1f], [0x7f, 0x9f], [0x200b, 0x200f], [0x2028, 0x202e], [0x2060, 0x2069], [0xfeff, 0xfeff]]
    .map(([a, b]) => `${String.fromCharCode(a)}-${String.fromCharCode(b)}`)
    .join("")}]`,
  "g",
);

/** Checks and tidies what the buyer typed: a valid recipient email, an optional name on one line and an
 * optional plain-text message, each within its limit. Checkout and the webhook both run it. */
export function cleanGift(raw: unknown): { ok: true; gift: GiftDetails } | { ok: false; error: string } {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v : "");
  const to = text(r.to).trim().toLowerCase();
  if (!to) return { ok: false, error: "Add the email address the gift should go to." };
  if (to.length > EMAIL_MAX || !EMAIL.test(to)) return { ok: false, error: "That email address doesn't look right." };
  const from = text(r.from).replace(HIDDEN, "").replace(/\s+/g, " ").trim();
  if (from.length > GIFT_NAME_MAX) return { ok: false, error: `Keep your name to ${GIFT_NAME_MAX} characters.` };
  const message = text(r.message)
    .replace(/\r\n?/g, "\n")
    .replace(HIDDEN, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  if (message.length > GIFT_MESSAGE_MAX) return { ok: false, error: `Keep the message to ${GIFT_MESSAGE_MAX} characters.` };
  return { ok: true, gift: { to, from: from || null, message: message || null } };
}

/** Crockford's base32: no I, L, O or U, so a code reads aloud and types cleanly. 16 characters = 80 bits. */
export const GIFT_CODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** "abcd efgh-jkmn pqrs" → "ABCDEFGHJKMNPQRS", or null. O is read as 0, and I or L as 1. */
export function normalizeGiftCode(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const code = raw.slice(0, 64).toUpperCase().replace(/[\s-]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
  return /^[0-9A-HJKMNP-TV-Z]{16}$/.test(code) ? code : null;
}

/** ABCD-EFGH-JKMN-PQRS */
export const formatGiftCode = (code: string): string => code.match(/.{1,4}/g)?.join("-") ?? code;

/** r***@example.com: the billing page names the recipient without spelling out their address. */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf("@");
  return at > 0 ? `${email[0]}***${email.slice(at)}` : "***";
}

/** The redeem link. The code rides in the fragment, which browsers never send to a server, and which
 * PostHog and GA leave out of page URLs; the redeem page reads it and clears it from the address bar. */
export const giftRedeemUrl = (site: string, code: string) => `${site.replace(/\/+$/, "")}/gift/redeem#gift=${formatGiftCode(code)}`;
