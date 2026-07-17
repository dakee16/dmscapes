// Shared planner types. The layout/template types live with the matcher —
// re-exported here so UI code has one import point.
export type {
  FurnitureItem,
  LayoutTemplate,
  MatchResult,
  RoomConstraints,
  RoomInput,
} from "@/templates/template-matcher";

/** One entry in data/product-catalog.json. */
export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  style_tags: StyleId[];
  budget_tier: BudgetTier;
  price: number;
  amazon_asin: string;
  affiliate_url: string;
  image_url: string;
  width_ft: number | null;
  length_ft: number | null;
  height_ft: number | null;
  color: string;
  rating: number;
  review_count: number;
  alternative_ids: string[];
  description: string;
  active: boolean;
}

export type StyleId = "minimalist" | "cozy" | "gamer" | "boho" | "preppy";
export type BudgetTier = "budget" | "mid" | "premium";

export type ProductCategory =
  | "bedding"
  | "rug"
  | "desk_lamp"
  | "ambient_lighting"
  | "wall_decor"
  | "storage"
  | "throw"
  | "curtains"
  | "desk_accessories"
  | "mirror"
  | "laundry_hamper"
  | "power_strip"
  | "trash_can"
  | "towel_caddy"
  | "accent";

// ---- Compact schools index (lib/schools-index.json, built by scripts/build-schools-index.mjs)

export interface RoomSummary {
  type: string;
  label: string;
  occupants: number | null;
  /** null when the school doesn't publish dimensions — user enters them manually. */
  length_ft: number | null;
  width_ft: number | null;
  sqft: number | null;
  closet: { width_ft: number; depth_ft: number; wall: string | null } | null;
}

export interface DormSummary {
  id: string;
  name: string;
  rooms: RoomSummary[];
}

export interface SchoolSummary {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  dorms: DormSummary[];
}

// ---- Planner selections

export interface SelectedRoom {
  type: string;
  occupants: number;
  lengthFt: number;
  widthFt: number;
  /** "catalog" = picked from a school's data, "manual" = typed in. */
  source: "catalog" | "manual";
}
