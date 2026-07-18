import type { SelectedRoom } from "./types";

// Housing-data slugs use a few dense abbreviations worth preserving verbatim,
// plus small words that shouldn't be title-cased.
const TOKEN_MAP: Record<string, string> = {
  ac: "AC",
  ada: "ADA",
  fsa: "FSA",
  w: "w/",
  for: "for",
  in: "in",
  per: "per",
  with: "with",
};

/**
 * Human-readable room type from a raw data slug:
 * "double_traditional" -> "Double Traditional", "single_w_ac" -> "Single w/AC".
 * Always shorter than the housing catalog's label (which can be a sentence),
 * so compact UI like the result-page subtitle formats the slug.
 */
export function formatRoomType(slug: string): string {
  return slug
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((t) => TOKEN_MAP[t] ?? (/^\d/.test(t) ? t : t[0].toUpperCase() + t.slice(1)))
    .join(" ")
    .replaceAll("w/ ", "w/");
}

/** Display name for the planner's selected room. */
export function roomTypeLabel(room: Pick<SelectedRoom, "type">): string {
  return formatRoomType(room.type);
}
