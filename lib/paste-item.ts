// "Add your own item" helpers: pull an ASIN + a best-guess title out of a pasted
// Amazon URL, apply our affiliate tag, and auto-match the title to one of the 15
// planner categories. Pure + framework-free so it can run on the server route and
// be unit-checked. See app/api/product-lookup/route.ts for the fetch that uses it.
import type { ProductCategory } from "./types";

export const PARTNER_TAG = "dailyama09e85-20";

/** Extract a 10-char ASIN from the common Amazon URL shapes, or null. */
export function extractAsin(url: string): string | null {
  if (typeof url !== "string") return null;
  const u = url.trim();
  // Canonical path forms first (most reliable).
  const paths = [
    /\/(?:dp|gp\/product|gp\/aw\/d|gp\/aw\/d\/|product|dp\/product)\/([A-Z0-9]{10})(?:[/?#]|$)/i,
    /[?&]asin=([A-Z0-9]{10})(?:[&#]|$)/i,
    /\/gp\/offer-listing\/([A-Z0-9]{10})(?:[/?#]|$)/i,
  ];
  for (const re of paths) {
    const m = u.match(re);
    if (m) return m[1].toUpperCase();
  }
  // Bare path segment fallback, but only accept ASIN-shaped tokens (start with
  // B + 9 alnum) so slug words like "TWINXLDORM" aren't misread as an ASIN.
  const bare = u.match(/\/(B[A-Z0-9]{9})(?:[/?#]|$)/i);
  if (bare) return bare[1].toUpperCase();
  return null;
}

/** The human-readable slug Amazon puts before /dp/ ("Bedsure-Fleece-Blanket"
 *  -> "Bedsure Fleece Blanket"), a decent title when the API can't be reached. */
export function slugTitleFromUrl(url: string): string | null {
  if (typeof url !== "string") return null;
  const m = url.match(/amazon\.[a-z.]+\/([^/?#]+)\/(?:dp|gp\/product|gp\/aw\/d)\//i);
  if (!m) return null;
  const slug = decodeURIComponent(m[1]).replace(/[-_+]/g, " ").replace(/\s+/g, " ").trim();
  if (slug.length < 3 || /^(dp|gp|product|ref|d)$/i.test(slug)) return null;
  return slug;
}

/** Force our affiliate tag onto a product URL (replace any existing tag). */
export function withAffiliateTag(asin: string): string {
  return `https://www.amazon.com/dp/${asin}?tag=${PARTNER_TAG}`;
}

// Title-keyword -> category. Ordered most-specific first; the first hit wins.
const CATEGORY_KEYWORDS: [ProductCategory, RegExp][] = [
  ["bedding", /\b(comforter|duvet|bed(ding| in a bag)|sheet set|quilt|coverlet)\b/i],
  ["throw", /\b(throw blanket|throw|fleece blanket|sherpa)\b/i],
  ["rug", /\b(rug|carpet|runner|mat)\b/i],
  ["desk_lamp", /\b(desk lamp|task lamp|reading lamp|clip lamp)\b/i],
  ["ambient_lighting", /\b(string lights|fairy lights|led strip|neon sign|salt lamp|lava lamp|projector|night ?light)\b/i],
  ["wall_decor", /\b(poster|wall art|tapestry|picture frame|photo frame|wall decor|canvas print|pennant)\b/i],
  ["mirror", /\b(mirror)\b/i],
  ["storage", /\b(storage (bin|cube|cart|drawer)|organizer bin|shelf|shelving|cube organizer|closet organizer|drawer unit)\b/i],
  ["curtains", /\b(curtain|drape|blackout)\b/i],
  ["desk_accessories", /\b(desk (mat|pad|organizer)|monitor stand|desk shelf|pen holder|desk accessor)\b/i],
  ["laundry_hamper", /\b(hamper|laundry (basket|bag))\b/i],
  ["power_strip", /\b(power strip|surge protector|extension cord|charging station)\b/i],
  ["trash_can", /\b(trash can|waste ?basket|garbage can|bin)\b/i],
  ["towel_caddy", /\b(shower caddy|towel|caddy|bath tote)\b/i],
  ["accent", /\b(plant|string art|galaxy|decor|figurine|accent)\b/i],
];

/** Best-effort category from a product title, or null if we can't be confident. */
export function matchCategory(title: string): ProductCategory | null {
  if (!title) return null;
  for (const [cat, re] of CATEGORY_KEYWORDS) if (re.test(title)) return cat;
  return null;
}

// ---- self-check (node lib/paste-item.ts won't run TS; see check below) --------
