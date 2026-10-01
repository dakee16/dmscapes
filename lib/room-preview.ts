import type { FurnitureItem, RoomSummary } from "./types";
import { matchTemplate } from "@/templates/template-matcher";
import { fitTemplateToRoom } from "./layout-fit";
import { formatRoomType } from "./format";

/** Size the school publishes (not an estimate, not blank). */
export const isPublished = (r: RoomSummary) => Boolean(r.length_ft && r.width_ft && !r.dims_estimated);
export const hasDims = (r: RoomSummary) => Boolean(r.length_ft && r.width_ft);

export const sqFtOf = (r: RoomSummary): number | null =>
  r.sqft ?? (r.length_ft && r.width_ft ? Math.round(r.length_ft * r.width_ft) : null);

export const roomName = (r: RoomSummary) => r.label || formatRoomType(r.type);

/** "Twin XL", "Full XL", … */
export function bedName(b: RoomSummary["bed_size"]): string {
  return b === "twin_xl" ? "Twin XL" : b === "full_xl" ? "Full XL" : b === "full" ? "Full" : b === "queen" ? "Queen" : "Twin";
}

/** Coarse family for filters: Single, Double, Triple, Quad, Suite & apartment. */
export function roomFamily(type: string): "Single" | "Double" | "Triple" | "Quad" | "Suite" | "Other" {
  const t = type.toLowerCase();
  if (/suite|apartment|studio|bedroom/.test(t)) return "Suite";
  if (/quad/.test(t)) return "Quad";
  if (/triple/.test(t)) return "Triple";
  if (/double/.test(t)) return "Double";
  if (/single/.test(t)) return "Single";
  return "Other";
}

/** 12 → "12", 12.4 → "12.4" */
export const ft = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ""));

export interface FittedRoom {
  lengthFt: number;
  widthFt: number;
  /** built-in pieces only (bed, desk, chair, dresser), placed by the planner's template */
  furniture: FurnitureItem[];
  isCorridor: boolean;
}

/**
 * The room drawn the way the planner would start it: the closest layout
 * template, fitted to the room's real size. Length runs along x.
 */
export function fitRoom(r: RoomSummary): FittedRoom | null {
  if (!r.length_ft || !r.width_ft) return null;
  const lengthFt = Math.max(r.length_ft, r.width_ft);
  const widthFt = Math.min(r.length_ft, r.width_ft);
  const match = matchTemplate({
    length_ft: lengthFt,
    width_ft: widthFt,
    occupants: r.occupants ?? 2,
    room_type: r.type,
  });
  const furniture = fitTemplateToRoom(match.template.furniture, match.template_id, lengthFt, widthFt).filter(
    (f) => f.built_in
  );
  return { lengthFt, widthFt, furniture, isCorridor: match.template_id.startsWith("corridor-") };
}
