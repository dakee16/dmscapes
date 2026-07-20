import type { FurnitureItem, ProductCategory } from "./types";

/**
 * Cross-highlighting link (result page only): given a canvas furniture item,
 * which product-list category does it correspond to? Used to glow the matching
 * canvas item(s) when a product tile is hovered/clicked, and vice-versa.
 *
 * Purchasable items carry a hyphenated `product_category`; the two dorm-provided
 * built-ins worth linking (beds → bedding, desks → desk accessories) are matched
 * by `type`. Items with no product counterpart (dressers, chairs) return null.
 */
const CATEGORY_BY_PRODUCT_TAG: Record<string, ProductCategory> = {
  rug: "rug",
  "desk-lamp": "desk_lamp",
  "string-lights": "ambient_lighting",
  "wall-decor": "wall_decor",
  "storage-bins": "storage",
  "throw-pillows": "throw",
  mirror: "mirror",
  "laundry-hamper": "laundry_hamper",
  "power-strip": "power_strip",
  "trash-can": "trash_can",
};

const CATEGORY_BY_TYPE: Record<string, ProductCategory> = {
  bed: "bedding",
  desk: "desk_accessories",
};

export function furnitureCategory(f: FurnitureItem): ProductCategory | null {
  if (f.product_category && CATEGORY_BY_PRODUCT_TAG[f.product_category]) {
    return CATEGORY_BY_PRODUCT_TAG[f.product_category];
  }
  return CATEGORY_BY_TYPE[f.type] ?? null;
}
