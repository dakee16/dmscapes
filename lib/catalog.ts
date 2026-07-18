import rawCatalog from "@/data/product-catalog.json";
import type { BudgetTier, Product, ProductCategory, StyleId } from "./types";

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
};

const byIdMap = new Map(CATALOG.map((p) => [p.id, p]));

export function productById(id: string): Product | undefined {
  return byIdMap.get(id);
}

/** Budget slider value -> catalog tier. Tier room targets: 200-400 / 400-700 / 700-1500. */
export function tierForBudget(budget: number): BudgetTier {
  if (budget <= 400) return "budget";
  if (budget <= 700) return "mid";
  return "premium";
}

/** The default product per category for a style + tier (catalog has exactly one). */
export function productsFor(style: StyleId, tier: BudgetTier): Product[] {
  const picks: Product[] = [];
  for (const cat of CATEGORY_ORDER) {
    const p = CATALOG.find(
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
export function categoriesCovered(style: StyleId, budget: number): string[] {
  const tier = tierForBudget(budget);
  let remaining = budget;
  const covered: string[] = [];
  for (const p of productsFor(style, tier)) {
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
