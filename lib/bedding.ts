import type { BedSize } from "./types";

/**
 * The product catalog ships Twin XL bedding (the US dorm standard). When a
 * room's provided mattress is a different size, that bedding won't fit right,
 * so the planner surfaces an advisory instead of silently recommending it.
 */
export interface BeddingAdvisory {
  /** "warning" = listed bedding won't fit; "info" = minor size note. */
  level: "warning" | "info";
  /** Human name of the actual mattress, e.g. "Full XL". */
  bedLabel: string;
  /** What to search for on Amazon instead, e.g. "Full XL sheets". */
  searchFor: string;
  message: string;
}

const BED_LABEL: Record<Exclude<BedSize, "twin_xl">, string> = {
  twin: "standard twin",
  full: "full-size",
  full_xl: "Full XL",
};

/**
 * Advisory for a room's bed size, or null when Twin XL bedding fits (the
 * default). `full` / `full_xl` are warnings — the catalog's Twin XL bedding is
 * too narrow — while `twin` is a minor note that Twin XL runs slightly long.
 */
export function beddingAdvisory(bedSize: BedSize | undefined): BeddingAdvisory | null {
  switch (bedSize) {
    case "full_xl":
      return {
        level: "warning",
        bedLabel: BED_LABEL.full_xl,
        searchFor: "Full XL bedding",
        message:
          "This room has Full XL beds, which are wider than a Twin XL. The bedding below is Twin XL and won't fit. Search Amazon for Full XL sheets and a full-size comforter instead.",
      };
    case "full":
      return {
        level: "warning",
        bedLabel: BED_LABEL.full,
        searchFor: "full-size bedding",
        message:
          "This room has full-size beds, which are wider than a Twin XL. The bedding below is Twin XL and won't fit. Search Amazon for full-size sheets and a full-size comforter instead.",
      };
    case "twin":
      return {
        level: "info",
        bedLabel: BED_LABEL.twin,
        searchFor: "standard twin bedding",
        message:
          "This room has standard twin beds, about 5 inches shorter than a Twin XL. The Twin XL bedding below still works, but standard twin sheets fit best.",
      };
    default:
      return null; // twin_xl (or unset) — Twin XL bedding fits
  }
}
