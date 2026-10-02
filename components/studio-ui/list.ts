import type { Product, ProductCategory } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/catalog";

/**
 * How the shopping list groups its pieces (design: Bedding, Lighting, Storage,
 * Decor with subtotals). UI only: the cart and its categories are unchanged.
 */
export type ListGroupKey = "bedding" | "lighting" | "storage" | "desk" | "decor" | "own";
export const LIST_GROUPS: { key: ListGroupKey; label: string; categories: ProductCategory[] }[] = [
  { key: "bedding", label: "Bedding", categories: ["bedding"] },
  { key: "lighting", label: "Lighting", categories: ["desk_lamp", "ambient_lighting"] },
  { key: "storage", label: "Storage", categories: ["storage", "laundry_hamper", "towel_caddy", "trash_can"] },
  { key: "desk", label: "Desk", categories: ["desk_accessories", "desk_organizer", "power_strip", "clip_fan"] },
  { key: "decor", label: "Decor", categories: ["rug", "throw", "wall_decor", "curtains", "mirror", "plant", "tapestry", "accent"] },
];
export const OWN_GROUP = { key: "own" as const, label: "Your additions" };

export function groupOf(category: ProductCategory): ListGroupKey {
  return LIST_GROUPS.find((g) => g.categories.includes(category))?.key ?? "decor";
}

export interface ListEntry {
  product: Product;
  /** 1-based list number; the canvas pin shows the same number. */
  number: number;
  group: ListGroupKey;
  /** "Add your own" item (not a catalog category pick). */
  custom: boolean;
}

/** Order the cart into groups and number it, so the list and the pins agree. */
export function numberEntries(cart: Product[], custom: Product[]): ListEntry[] {
  const entries: ListEntry[] = [];
  let n = 1;
  for (const g of LIST_GROUPS) {
    const inGroup = cart
      .filter((p) => groupOf(p.category) === g.key)
      .sort((a, b) => g.categories.indexOf(a.category) - g.categories.indexOf(b.category));
    for (const p of inGroup) entries.push({ product: p, number: n++, group: g.key, custom: false });
  }
  for (const p of custom) entries.push({ product: p, number: n++, group: "own", custom: true });
  return entries;
}

export const pad2 = (n: number) => String(n).padStart(2, "0");

/** Whole dollars for headline totals, cents for a single product. */
export const dollars = (n: number) => `$${Math.round(n).toLocaleString("en-US")}`;
export const price = (n: number) => `$${n.toFixed(2)}`;

/** 5′ × 7′ for floor pieces, 14″ × 48″ for small ones. Set in Archivo (the mono has no ′ ″). */
export function feetInches(ft: number): string {
  const inches = Math.round(ft * 12);
  const f = Math.floor(inches / 12), i = inches % 12;
  return i ? `${f}′${i}″` : `${f}′`;
}
export function sizeLabel(w: number | null | undefined, l: number | null | undefined): string | null {
  if (!w || !l || !Number.isFinite(w) || !Number.isFinite(l)) return null;
  if (Math.max(w, l) < 3) return `${Math.round(w * 12)}″ × ${Math.round(l * 12)}″`;
  return `${feetInches(w)} × ${feetInches(l)}`;
}

const BED_SIZES: Record<string, string> = { twin_xl: "Twin XL", twin: "Twin", full: "Full", full_xl: "Full XL", queen: "Queen" };

/** The short line under a product name: its size where the catalog has one. */
export function productDetail(p: Product): string {
  if (p.category === "bedding") return `${CATEGORY_LABELS.bedding} · ${BED_SIZES[p.bed_size ?? "twin_xl"]}`;
  const size = sizeLabel(p.width_ft, p.length_ft);
  if (size) return size;
  if (p.height_ft) return `${Math.round(p.height_ft * 12)}″ tall`;
  return CATEGORY_LABELS[p.category] ?? p.category;
}

export function categoryNoun(category: ProductCategory): string {
  return (CATEGORY_LABELS[category] ?? "piece").toLowerCase();
}
