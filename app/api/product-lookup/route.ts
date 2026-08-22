import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { getItems } from "@/lib/creators-api";
import {
  extractAsin,
  slugTitleFromUrl,
  matchCategory,
  withAffiliateTag,
} from "@/lib/paste-item";
import type { Product, ProductCategory } from "@/lib/types";

// POST /api/product-lookup — the "Add your own item" paste flow. Extracts the
// ASIN from a pasted Amazon URL, looks it up through the Creators API (with our
// affiliate tag), and returns a Product the result page can drop into the cart.
//
// DEMO FALLBACK: the Creators API is gated behind Amazon affiliate eligibility
// and currently returns 403. Rather than dead-end the whole feature, a lookup
// that can't reach real data falls back to a CLEARLY-MARKED demo product built
// from the URL's own slug (title) + a deterministic placeholder price/image, so
// the add-to-cart / budget / canvas flow is fully exercised now and flips to
// real data automatically once the account qualifies (no code change).

export interface ProductLookupResponse {
  ok: boolean;
  product?: Product;
  /** Confident category match (for canvas auto-placement), or null -> unplaced. */
  category?: ProductCategory | null;
  /** True when the product is a demo placeholder, not live Amazon data. */
  demo?: boolean;
  error?: string;
}

// Stable pseudo-price from the ASIN so a demo item doesn't jump around on retry.
function demoPrice(asin: string): number {
  let h = 0;
  for (let i = 0; i < asin.length; i++) h = (h * 31 + asin.charCodeAt(i)) >>> 0;
  return Math.round((14 + (h % 46)) ) + 0.99; // ~$14.99–$59.99
}

// Neutral placeholder image (inline SVG data URI) for demo items — no external
// fetch, renders in the same <img> the real product would.
function placeholderImage(): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'>` +
    `<rect width='160' height='160' fill='%23f4f4f2'/>` +
    `<g fill='none' stroke='%232b4eff' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'>` +
    `<path d='M52 60h56l-6 44a8 8 0 0 1-8 7H66a8 8 0 0 1-8-7z'/>` +
    `<path d='M68 60a12 12 0 0 1 24 0'/></g>` +
    `<text x='80' y='140' font-family='monospace' font-size='11' fill='%236b6b7b' text-anchor='middle'>DEMO ITEM</text></svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}

function buildProduct(
  asin: string,
  title: string,
  price: number,
  imageUrl: string,
  rating: number,
  reviewCount: number,
  category: ProductCategory
): Product {
  return {
    id: `own-${asin}`,
    name: title,
    category,
    style_tags: ["custom"],
    budget_tier: "mid",
    price,
    amazon_asin: asin,
    affiliate_url: withAffiliateTag(asin),
    image_url: imageUrl,
    width_ft: null,
    length_ft: null,
    height_ft: null,
    color: "",
    rating,
    review_count: reviewCount,
    alternative_ids: [],
    description: "",
    active: true,
  };
}

export async function POST(request: Request) {
  const rl = rateLimit(request, "product-lookup", 15, 60_000);
  if (!rl.allowed) {
    return NextResponse.json(
      { ok: false, error: "Too many lookups. Give it a moment." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } }
    );
  }

  let body: { url?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const url = typeof body.url === "string" ? body.url.trim() : "";
  if (!url) {
    return NextResponse.json(
      { ok: false, error: "Paste an Amazon product link to add it." },
      { status: 400 }
    );
  }
  const asin = extractAsin(url);
  if (!asin) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "That doesn't look like an Amazon product link. Copy the URL from the product page (it should contain a /dp/ code).",
      },
      { status: 422 }
    );
  }

  // Try real Creators data first.
  try {
    const items = await getItems([asin]);
    const it = items[0];
    if (it && it.title && it.price != null && it.imageUrl) {
      const category = matchCategory(it.title);
      const product = buildProduct(
        asin,
        it.title,
        it.price,
        it.imageUrl,
        it.rating ?? 0,
        it.reviewCount ?? 0,
        category ?? "accent"
      );
      return NextResponse.json({ ok: true, product, category, demo: false });
    }
    // Reached the API but no usable item -> fall through to demo.
    console.warn(`[product-lookup] ${asin}: API returned no usable item; using demo.`);
  } catch (err) {
    // 403 (eligibility) or any API error -> demo fallback, logged not swallowed.
    console.warn(
      `[product-lookup] ${asin}: Creators getItems failed, using demo fallback:`,
      err instanceof Error ? err.message : err
    );
  }

  // DEMO fallback: title from the URL slug, deterministic price + placeholder.
  const title = slugTitleFromUrl(url) ?? `Amazon item ${asin}`;
  const category = matchCategory(title);
  const product = buildProduct(
    asin,
    title,
    demoPrice(asin),
    placeholderImage(),
    0,
    0,
    category ?? "accent"
  );
  return NextResponse.json({ ok: true, product, category, demo: true });
}
