import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  validateVibe,
  generateVibeQueries,
  CORE_VIBE_CATEGORIES,
} from "@/lib/custom-vibe";
import { CATALOG, tierForBudget, beddingFor } from "@/lib/catalog";
import { creatorsConfigured, creatorsDiagnostics, searchItems } from "@/lib/creators-api";
import type { BedSize, BudgetTier, Product, ProductCategory } from "@/lib/types";

// POST /api/vibe/generate, the "Create your own vibe" pipeline.
//
// Flow: validate → query-gen (deterministic v1, see lib/custom-vibe) → per-
// category product search (Amazon Creators API, OAuth bearer token) → quality +
// budget filter → return a Product[] the result page renders exactly like a
// curated vibe. When Creators credentials are absent it returns CLEARLY-MARKED
// mock products drawn from the curated catalog so the whole flow stays
// demonstrable. See lib/creators-api.ts for the auth/search layer.

export interface VibeGenerateResponse {
  products: Product[];
  /** True when the products are placeholder matches, not live Creators results. */
  mock: boolean;
  vibe: string;
}

// Curated quality bar, mirrored from the hand-verified catalog.
const MIN_RATING = 4.0;
const MIN_REVIEWS = 500;

/** Price windows per budget tier (rough, for the live PA-API MinPrice/MaxPrice
 *  and mock sanity). Mirrors tierForBudget's room targets. */
const TIER_PRICE: Record<BudgetTier, { min: number; max: number }> = {
  budget: { min: 5, max: 60 },
  mid: { min: 10, max: 120 },
  premium: { min: 15, max: 300 },
};

/**
 * MOCK product set. Samples the curated catalog by budget tier so every match
 * is a real, buyable item (real image, price, ASIN, affiliate link), but it is
 * NOT vibe-specific matching. Clearly flagged mock:true in the response. `seed`
 * rotates the pick so the one free regeneration returns a different set.
 */
function buildMock(tier: BudgetTier, seed: number, bedSize?: BedSize): Product[] {
  const out: Product[] = [];
  for (const cat of CORE_VIBE_CATEGORIES) {
    let candidates =
      cat === "bedding"
        ? // Bedding honors the room's mattress size via the existing helper.
          [beddingFor("minimalist", tier, bedSize)].filter(
            (p): p is Product => Boolean(p)
          )
        : CATALOG.filter((p) => p.active && p.category === cat && p.budget_tier === tier);
    // Apply the curated quality bar; fall back to all if it would empty the set.
    const quality = candidates.filter(
      (p) => p.rating >= MIN_RATING && p.review_count >= MIN_REVIEWS
    );
    if (quality.length > 0) candidates = quality;
    if (candidates.length === 0) continue;
    // Rank by review volume (proxy for a safe pick), then rotate by seed.
    const ranked = [...candidates].sort((a, b) => b.review_count - a.review_count);
    const base = ranked[seed % ranked.length];
    out.push({
      ...base,
      id: `cv-${cat}-${seed}`,
      category: cat,
      style_tags: ["custom"],
      budget_tier: tier,
      alternative_ids: [],
      active: true,
    });
  }
  return out;
}

/**
 * LIVE product set from the Amazon Creators API. One throttled searchItems call
 * per category, then a quality pick: a real image, a buyable price, and — when
 * the Creators API returns them — the curated rating/review bar (PA-API 5.0 did
 * not return these; the Creators response is checked at runtime and the raw
 * shape is logged once in lib/creators-api). Any per-category failure is logged
 * loudly rather than silently swallowed.
 */
async function buildLive(
  queries: Record<string, string>,
  tier: BudgetTier
): Promise<Product[]> {
  const { min, max } = TIER_PRICE[tier];
  const out: Product[] = [];
  for (const cat of CORE_VIBE_CATEGORIES) {
    try {
      const items = await searchItems({
        keywords: queries[cat],
        itemCount: 5,
        minPrice: min,
        maxPrice: max,
      });
      // Require a usable listing (real image + buyable price). When the Creators
      // API supplies ratings/reviews, prefer picks that clear the curated bar;
      // fall back to any usable listing so a category is never dropped for want
      // of review data.
      const usable = items.filter((it) => it.imageUrl && it.price != null);
      const quality = usable.filter(
        (it) =>
          it.rating != null &&
          it.reviewCount != null &&
          it.rating >= MIN_RATING &&
          it.reviewCount >= MIN_REVIEWS
      );
      const pick = (quality[0] ?? usable[0]) as (typeof items)[number] | undefined;
      if (pick && pick.price != null) {
        out.push({
          id: `creators-${pick.asin}`,
          name: pick.title,
          category: cat as ProductCategory,
          style_tags: ["custom"],
          budget_tier: tier,
          price: pick.price,
          amazon_asin: pick.asin,
          affiliate_url: pick.detailPageUrl,
          image_url: pick.imageUrl ?? "",
          width_ft: null,
          length_ft: null,
          height_ft: null,
          color: "",
          rating: pick.rating ?? 0, // Creators API may return a real rating
          review_count: pick.reviewCount ?? 0, // and a real review count
          alternative_ids: [],
          description: "",
          active: true,
        });
      }
    } catch (err) {
      // Log loudly so a live failure (bad token, expired scope, access-restricted,
      // wrong marketplace) is visible in the server logs instead of being silently
      // swallowed and masked by the catalog fallback.
      console.error(
        `[vibe] Creators searchItems failed for "${cat}":`,
        err instanceof Error ? err.message : err
      );
    }
    // Throttle between calls to stay under the Creators API rate limit.
    await new Promise((r) => setTimeout(r, 1100));
  }
  return out;
}

/** Keep every live (PA-API) product; top up only the categories PA-API couldn't
 *  match from the curated catalog, returned in canonical category order. */
function fillMissingFromCatalog(
  live: Product[],
  tier: BudgetTier,
  seed: number,
  bedSize?: BedSize
): Product[] {
  const have = new Set(live.map((p) => p.category));
  const filler = buildMock(tier, seed, bedSize).filter((p) => !have.has(p.category));
  const all = [...live, ...filler];
  return CORE_VIBE_CATEGORIES.map((c) => all.find((p) => p.category === c)).filter(
    (p): p is Product => Boolean(p)
  );
}

export async function POST(request: Request) {
  const { allowed, retryAfterSec } = rateLimit(request, "vibe-generate", 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Give it a moment." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  let body: { vibe?: unknown; budget?: unknown; bedSize?: unknown; seed?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const vibe = typeof body.vibe === "string" ? body.vibe.trim().slice(0, 400) : "";
  const validation = validateVibe(vibe);
  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 422 });
  }

  const budget =
    typeof body.budget === "number" && body.budget >= 200 && body.budget <= 1500
      ? body.budget
      : 500;
  const bedSize = typeof body.bedSize === "string" ? (body.bedSize as BedSize) : undefined;
  const seed = typeof body.seed === "number" && body.seed >= 0 ? Math.floor(body.seed) : 0;
  const tier = tierForBudget(budget);

  const queries = generateVibeQueries(vibe);

  let products: Product[];
  let mock: boolean;
  if (creatorsConfigured()) {
    // One-time, non-secret diagnostic: which env names supplied the creds, their
    // lengths, and the public partner tag.
    const diag = creatorsDiagnostics();
    console.log(
      `[vibe] Creators API configured via ${diag?.usingNewNames ? "AMAZON_CREATORS_*" : "AMAZON_PAAPI_* (fallback)"}, ` +
        `credentialId ${diag?.credentialIdLen} chars, secret ${diag?.credentialSecretLen} chars, ` +
        `partnerTag "${diag?.partnerTag}"`
    );
    // Credentials present -> LIVE is authoritative. Whatever categories the
    // Creators API matches are used as-is; any it couldn't fill are topped up
    // from the curated catalog so the room is still complete, but the result
    // stays live-backed (mock:false). The catalog only fully takes over when
    // live returns NOTHING (a real failure, logged per-category in buildLive).
    const live = await buildLive(queries, tier);
    if (live.length > 0) {
      products = fillMissingFromCatalog(live, tier, seed, bedSize);
      mock = false;
      console.log(
        `[vibe] Creators live: ${live.length}/${CORE_VIBE_CATEGORIES.length} categories matched` +
          `, ${products.length - live.length} topped up from catalog`
      );
    } else {
      console.error(
        "[vibe] Creators API returned no products (see per-category errors above); falling back to catalog"
      );
      products = buildMock(tier, seed, bedSize);
      mock = true;
    }
  } else {
    products = buildMock(tier, seed, bedSize);
    mock = true;
  }

  const payload: VibeGenerateResponse = { products, mock, vibe };
  return NextResponse.json(payload);
}
