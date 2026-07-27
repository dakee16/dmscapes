import type { BedSize } from "./types";

/**
 * Most dorm beds are Twin XL, which the catalog's bedding fits. When a room's
 * mattress is a different size, the planner swaps in a size-appropriate set
 * (see beddingFor) and this advisory explains why, plus any sizing nuance.
 */
export interface BeddingAdvisory {
  /** "warning" = non-standard size worth flagging; "info" = minor size note. */
  level: "warning" | "info";
  message: string;
}

/**
 * Advisory for a room's bed size, or null for Twin XL (the default). For
 * full / full_xl the planner has already selected a full-size set, so the copy
 * confirms that and notes the Full XL sheet nuance; `twin` is a minor note that
 * Twin XL runs slightly long.
 */
export function beddingAdvisory(bedSize: BedSize | undefined): BeddingAdvisory | null {
  switch (bedSize) {
    case "full_xl":
      return {
        level: "warning",
        message:
          "These are Full XL beds (extra long). We've picked a full-size set here since a Twin XL won't fit, and for the 80-inch mattress, sheets labeled “Full XL” fit best.",
      };
    case "full":
      return {
        level: "warning",
        message:
          "These are full-size beds, wider than a Twin XL. We've picked a full-size set here, a standard Twin XL set won't fit them.",
      };
    case "twin":
      return {
        level: "info",
        message:
          "These are standard twin beds, about 5 inches shorter than a Twin XL. The set below still works, but standard twin sheets fit best.",
      };
    default:
      return null; // twin_xl (or unset), the catalog's Twin XL bedding fits
  }
}
