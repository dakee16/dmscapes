import rawCatalog from "@/data/product-catalog.json";
import type { BedSize, BudgetTier, Product, ProductCategory, StyleId } from "./types";

export const CATALOG = rawCatalog as Product[];

export const AFFILIATE_TAG = "dailyama09e85-20";

/** Display order for product groups; big-ticket room-definers first. */
export const CATEGORY_ORDER: ProductCategory[] = [
  "bedding",
  "rug",
  "desk_lamp",
  "ambient_lighting",
  "wall_decor",
  "storage",
  "throw",
  "curtains",
  "desk_accessories",
  "mirror",
  "laundry_hamper",
  "power_strip",
  "trash_can",
  "towel_caddy",
  "accent",
];

export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  bedding: "Bedding",
  rug: "Rug",
  desk_lamp: "Desk Lamp",
  ambient_lighting: "Ambient Lighting",
  wall_decor: "Wall Decor",
  storage: "Storage",
  throw: "Throw",
  curtains: "Curtains",
  desk_accessories: "Desk Accessories",
  mirror: "Mirror",
  laundry_hamper: "Laundry Hamper",
  power_strip: "Power Strip",
  trash_can: "Trash Can",
  towel_caddy: "Towels & Shower",
  accent: "Accent",
  plant: "Greenery",
  tapestry: "Tapestry",
  desk_organizer: "Desk Organizer",
  clip_fan: "Clip Fan",
};

/**
 * "Extras": genuinely new categories, beyond the core 15 the auto-list uses, that
 * only ever appear in the Catalog tab for browsing. They never seed into the
 * cart (the result page always parks them), so adding one is a deliberate,
 * budget-affecting choice. Order here is their display order in the Catalog.
 */
export const EXTRA_CATEGORIES: ProductCategory[] = [
  "plant",
  "tapestry",
  "desk_organizer",
  "clip_fan",
];
const EXTRA_SET = new Set<ProductCategory>(EXTRA_CATEGORIES);

/** Whether a category is a Catalog-only "extra" (never auto-added to the cart). */
export function isExtraCategory(category: ProductCategory): boolean {
  return EXTRA_SET.has(category);
}

/**
 * The extra products offered for a style: one active product per extra category
 * that tags this style. Untiered (extras are a flat browse set, not budget-fit
 * picks), so tier isn't considered. Empty until the catalog carries extras for
 * the style, so the Catalog simply falls back to the old behavior meanwhile.
 */
export function extrasFor(style: StyleId): Product[] {
  const out: Product[] = [];
  for (const cat of EXTRA_CATEGORIES) {
    const p = CATALOG.find(
      (x) => x.active && x.category === cat && x.style_tags.includes(style)
    );
    if (p) out.push(p);
  }
  return out;
}

const byIdMap = new Map(CATALOG.map((p) => [p.id, p]));

export function productById(id: string): Product | undefined {
  return byIdMap.get(id);
}

/** Budget slider value -> catalog tier. Tier room targets: 200-400 / 400-700 / 700-1500. */
export function tierForBudget(budget: number): BudgetTier {
  // Tuned so a budget lands a cart WITHIN ~\$50 of it, not hundreds under. The
  // auto-list is one product per category and the result-page seeder trims to
  // never exceed budget, so a higher tier fills a mid/high budget far closer
  // (premium sums ~\$700-790 for the well-stocked styles, and the seeder parks
  // whatever overflows). Sparse-premium styles (academia/y2k/retro/pastel) are
  // catalog-limited and tracked separately.
  if (budget <= 350) return "budget";
  if (budget <= 500) return "mid";
  return "premium";
}

/**
 * Bedding pick for a style, honoring the room's mattress size. Full / Full XL
 * beds get a full-size set (the catalog's Twin XL sets are too narrow); a
 * missing style falls back to any full-size set. Twin / Twin XL get the normal
 * style+tier Twin XL pick. Full-size sets are style-matched but not tiered, so
 * tier is ignored when a full bed is requested.
 */
export function beddingFor(
  style: StyleId,
  tier: BudgetTier,
  bedSize?: BedSize
): Product | undefined {
  if (bedSize === "full" || bedSize === "full_xl") {
    return (
      CATALOG.find(
        (x) =>
          x.active &&
          x.category === "bedding" &&
          x.bed_size === "full" &&
          x.style_tags.includes(style)
      ) ?? CATALOG.find((x) => x.active && x.category === "bedding" && x.bed_size === "full")
    );
  }
  return CATALOG.find(
    (x) =>
      x.active &&
      x.category === "bedding" &&
      (x.bed_size ?? "twin_xl") === "twin_xl" &&
      x.budget_tier === tier &&
      x.style_tags.includes(style)
  );
}

/**
 * The default product per category for a style + tier (catalog has exactly
 * one). Bedding additionally depends on the room's bed size.
 */
export function productsFor(style: StyleId, tier: BudgetTier, bedSize?: BedSize): Product[] {
  const picks: Product[] = [];
  for (const cat of CATEGORY_ORDER) {
    const p =
      cat === "bedding"
        ? beddingFor(style, tier, bedSize)
        : CATALOG.find(
            (x) =>
              x.active &&
              x.category === cat &&
              x.budget_tier === tier &&
              x.style_tags.includes(style)
          );
    if (p) picks.push(p);
  }
  return picks;
}

/** Resolve alternative_ids to products (other tiers, same style family). */
export function alternativesOf(p: Product): Product[] {
  return p.alternative_ids
    .map((id) => byIdMap.get(id))
    .filter((x): x is Product => Boolean(x))
    .sort((a, b) => a.price - b.price);
}

export function totalFor(products: Product[]): number {
  return Math.round(products.reduce((sum, p) => sum + p.price, 0) * 100) / 100;
}

/**
 * "Your $500 budget covers: bedding, rug, ..." Walk the category order
 * accumulating prices until the budget runs out.
 */
export function categoriesCovered(style: StyleId, budget: number, bedSize?: BedSize): string[] {
  const tier = tierForBudget(budget);
  let remaining = budget;
  const covered: string[] = [];
  for (const p of productsFor(style, tier, bedSize)) {
    if (p.price <= remaining) {
      covered.push(CATEGORY_LABELS[p.category]);
      remaining -= p.price;
    }
  }
  return covered;
}

/** Amazon bulk add-to-cart URL for the whole product list (keeps the associate tag). */
export function cartUrl(products: Product[]): string {
  const params = new URLSearchParams({ AssociateTag: AFFILIATE_TAG });
  products.forEach((p, i) => {
    params.set(`ASIN.${i + 1}`, p.amazon_asin);
    params.set(`Quantity.${i + 1}`, "1");
  });
  return `https://www.amazon.com/gp/aws/cart/add.html?${params.toString()}`;
}
