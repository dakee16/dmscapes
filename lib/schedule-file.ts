// Schedule files for Hall Finder's upload box (phase 1b): what we accept, told apart by
// their first bytes rather than the name, and the shape of a class read from one.
// Browser- and server-safe, no path aliases (scripts/check-hall-finder-schedules.mjs
// imports it straight into Node).

export type ScheduleKind = "png" | "jpeg" | "pdf";

/** The upload cap the route enforces. On Vercel a request body can't pass 4.5 MB, so the
 *  browser shrinks images first and keeps PDFs under PDF_MAX_BYTES. */
export const MAX_BYTES = 8 * 1024 * 1024;
export const PDF_MAX_BYTES = 4 * 1024 * 1024;
export const MAX_PAGES = 3;
/** Long edge the browser scales images to; Claude reads images at about this size anyway. */
export const IMAGE_EDGE = 1600;

/** PNG, JPEG or PDF by magic bytes; null for anything else (a renamed text file, a GIF…). */
export function sniff(head: Uint8Array): ScheduleKind | null {
  const at = (bytes: number[]) => bytes.every((b, i) => head[i] === b);
  if (at([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (at([0xff, 0xd8, 0xff])) return "jpeg";
  if (at([0x25, 0x50, 0x44, 0x46, 0x2d])) return "pdf"; // %PDF-
  return null;
}

export const MEDIA_TYPE: Record<ScheduleKind, "image/png" | "image/jpeg" | "application/pdf"> = {
  png: "image/png",
  jpeg: "image/jpeg",
  pdf: "application/pdf",
};

/** Days as the model writes them; the finder counts weekdays only (M = 1 … F = 16). */
export const READ_DAYS = ["M", "T", "W", "Th", "F", "Sa", "Su"] as const;
const WEEKDAYS = ["M", "T", "W", "Th", "F"];
export const weekdayMask = (days: readonly string[]) => days.reduce((m, d) => (WEEKDAYS.includes(d) ? m | (1 << WEEKDAYS.indexOf(d)) : m), 0);

/** One class read from a screenshot or PDF, as the route returns it. */
export interface ReadClass {
  course: string;
  /** Weekdays as a bitmask, M = 1 … F = 16 (weekend meetings dropped). */
  days: number;
  start: string | null;
  end: string | null;
  /** The location exactly as written on the schedule. */
  location: string;
  /** 0 to 1: how sure the reader was of this row. */
  confidence: number;
}

/** Below this, the confirm screen asks about the row even when the building matched. */
export const SURE = 0.8;

/** Why a read failed: the friendly state shown, and schedule_parse_failed's reason. */
export type ReadFailure = "not_schedule" | "unreadable" | "too_large" | "wrong_type" | "too_many_pages" | "rate_limited" | "unavailable";
