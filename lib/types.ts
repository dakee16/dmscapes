// Shared planner types. The layout/template types live with the matcher and
// are re-exported here so UI code has one import point.
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
  /** Bedding only: which mattress size this set fits. Absent = twin_xl. */
  bed_size?: BedSize;
}

export type StyleId =
  | "minimalist"
  | "cozy"
  | "gamer"
  | "boho"
  | "preppy"
  | "team_spirit"
  | "academia"
  | "y2k"
  | "retro"
  | "pastel"
  // "Create your own vibe" (Pro): a pseudo-style whose products come from the
  // live pipeline, not the curated catalog. Never shown in the picker grid.
  | "custom";
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
  | "accent"
  // Catalog "extras": genuinely new categories beyond the core 15 the
  // auto-generated list uses. They never seed into the cart; they live in the
  // Catalog tab for the student to browse and add (see lib/catalog EXTRA_*).
  | "plant"
  | "tapestry"
  | "desk_organizer"
  | "clip_fan";

// ---- Compact schools index (lib/schools-index.json, built by scripts/build-schools-index.mjs)

/**
 * Provided mattress size. "twin_xl" (36"×80") is the near-universal US dorm
 * default; the others are documented exceptions that change which bedding fits.
 */
export type BedSize = "twin_xl" | "twin" | "full" | "full_xl";

export interface RoomSummary {
  type: string;
  label: string;
  occupants: number | null;
  /**
   * Room size in feet. Real when the school publishes it; a best-fit estimate
   * (median of same-type rooms across the catalog) when `dims_estimated` is set;
   * null only when no same-type room anywhere has dims, so the user types them in.
   */
  length_ft: number | null;
  width_ft: number | null;
  sqft: number | null;
  /** Provided mattress size; defaults to "twin_xl" in the index builder. */
  bed_size: BedSize;
  /**
   * True when length_ft/width_ft are estimated from similar rooms rather than
   * published by the school (see scripts/build-schools-index.mjs). Absent = real.
   */
  dims_estimated?: boolean;
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
  /** Acronyms/alternate names for search (e.g. ["psu"], ["ucla"]); [] if none. */
  aliases: string[];
  dorms: DormSummary[];
}

// ---- Planner selections

export interface SelectedRoom {
  type: string;
  occupants: number;
  lengthFt: number;
  widthFt: number;
  /** Provided mattress size; "twin_xl" unless the school documents otherwise. */
  bedSize: BedSize;
  /** "catalog" = picked from a school's data, "manual" = typed in. */
  source: "catalog" | "manual";
  /**
   * True when lengthFt/widthFt are a same-type estimate rather than a published
   * or user-entered size, so the UI can label the dimensions honestly.
   */
  dimsEstimated?: boolean;
}
