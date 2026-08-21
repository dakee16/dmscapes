import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import {
  validateVibe,
  generateVibeQueries,
  CORE_VIBE_CATEGORIES,
} from "@/lib/custom-vibe";
import { CATALOG, tierForBudget, beddingFor } from "@/lib/catalog";
import { paapiConfigured, searchItems } from "@/lib/paapi";
import type { BedSize, BudgetTier, Product, ProductCategory } from "@/lib/types";

// POST /api/vibe/generate — the "Create your own vibe" pipeline.
//
// Flow: validate → query-gen (deterministic v1, see lib/custom-vibe) → per-
// category product search → quality + budget filter → return a Product[] the
// result page renders exactly like a curated vibe. When PA-API credentials are
// absent (they are, today) it returns CLEARLY-MARKED mock products drawn from
// the curated catalog so the whole flow is demonstrable and one credential-flip
// from live. See lib/paapi.ts for activation steps.

export interface VibeGenerateResponse {
  products: Product[];
  /** True when the products are placeholder matches, not live PA-API results. */
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
 * is a real, buyable item (real image, price, ASIN, affiliate link) — but it is
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
 * LIVE product set from PA-API. One throttled SearchItems call per category
 * (PA-API's ~1 req/sec limit), quality-filtered on what PA-API actually returns:
 * a real image, a buyable price in tier range, and Prime. NOTE: PA-API 5.0 does
 * NOT return star ratings or review counts, so the rating/review thresholds used
 * for the curated catalog and the mock cannot be applied here — flagged for the
 * activation review. Never runs today (paapiConfigured() is false).
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
      // PA-API already applied MinPrice/MaxPrice; just require a usable listing
      // (a real image + a buyable price). Re-filtering on the same narrow window
      // here only threw away otherwise-good live matches.
      const pick = items.find((it) => it.imageUrl && it.price != null);
      if (pick && pick.price != null) {
        out.push({
          id: `paapi-${pick.asin}`,
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
          rating: 0, // PA-API 5.0 does not return ratings
          review_count: 0, // PA-API 5.0 does not return review counts
          alternative_ids: [],
          description: "",
          active: true,
        });
      }
    } catch (err) {
      // Log loudly so a live failure (bad signature, throttle, quota, wrong
      // marketplace) is visible in the server logs instead of being silently
      // swallowed and masked by the catalog fallback.
      console.error(
        `[vibe] PA-API SearchItems failed for "${cat}":`,
        err instanceof Error ? err.message : err
      );
    }
    // Throttle to respect PA-API's per-second limit.
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
  if (paapiConfigured()) {
    // Credentials present -> LIVE is authoritative. Whatever categories PA-API
    // matches are used as-is; any it couldn't fill are topped up from the curated
    // catalog so the room is still complete, but the result stays live-backed
    // (mock:false). The catalog only fully takes over when live returns NOTHING
    // (a real failure — now logged per-category in buildLive above).
    const live = await buildLive(queries, tier);
    if (live.length > 0) {
      products = fillMissingFromCatalog(live, tier, seed, bedSize);
      mock = false;
      console.log(
        `[vibe] PA-API live: ${live.length}/${CORE_VIBE_CATEGORIES.length} categories matched` +
          `, ${products.length - live.length} topped up from catalog`
      );
    } else {
      console.error(
        "[vibe] PA-API returned no products (see per-category errors above); falling back to catalog"
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
