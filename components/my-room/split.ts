import type { SaveRoomRequest } from "@/lib/api-types";
import type { FurnitureItem, Product } from "@/lib/types";
import { assignOwnership, DEFAULT_PLANNING } from "@/lib/planning";
import { bedMetrics } from "@/lib/bed-config";
import { footprint } from "@/components/canvas/geometry";

export type SplitMode = "middle" | "beds" | "none";
export type Side = "me" | "them" | "shared";
export type Axis = "x" | "y";

/** Which way the line runs: across the room between the two beds. With beds on
 * the long walls the line runs lengthwise; with beds at either end, crosswise. */
export function splitAxis(furniture: FurnitureItem[], lengthFt: number, widthFt: number): Axis {
  const beds = furniture.filter(f => bedMetrics(f) || f.type === "bed").map(f => { const b = footprint(f); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; });
  if (beds.length < 2) return lengthFt >= widthFt ? "x" : "y";
  const spread = (k: "x" | "y") => Math.max(...beds.map(b => b[k])) - Math.min(...beds.map(b => b[k]));
  return spread("x") / lengthFt >= spread("y") / widthFt ? "x" : "y";
}

/** Draw the line: which side each piece starts on. Pieces that straddle the
 * line (or sit in the middle strip when splitting by bed) start shared. */
export function sideOf(f: FurnitureItem, extentFt: number, mode: SplitMode, mineFirst: boolean, axis: Axis = "x"): Side {
  if (mode === "none") return "shared";
  const b = footprint(f), start = axis === "x" ? b.x : b.y, size = axis === "x" ? b.w : b.h, center = start + size / 2;
  let first: boolean | null;
  if (mode === "middle") {
    const mid = extentFt / 2;
    first = start < mid - 0.25 && start + size > mid + 0.25 ? null : center < mid;
  } else {
    first = center < extentFt / 3 ? true : center > (extentFt * 2) / 3 ? false : null;
  }
  if (first === null) return "shared";
  return first === mineFirst ? "me" : "them";
}

/** Where the line(s) fall along the split axis, in feet. */
export function linePositions(extentFt: number, mode: SplitMode) {
  return mode === "middle" ? [extentFt / 2] : mode === "beds" ? [extentFt / 3, (extentFt * 2) / 3] : [];
}

/** Apply a split to a workspace snapshot: my side is mine, the other side goes
 * to a "Roommate" placeholder (handed over once they join), the rest is shared.
 * Uses the same ownership ledger as the planner (furniture + product supply). */
export function applySplit(snapshot: SaveRoomRequest, userId: string, mode: SplitMode, mineFirst: boolean): SaveRoomRequest {
  const next = structuredClone(snapshot);
  const d = next.room_dimensions, editor = d.editor;
  const axis = splitAxis(next.furniture_positions, d.length_ft, d.width_ft), extent = axis === "x" ? d.length_ft : d.width_ft;
  let planning = { ...DEFAULT_PLANNING, ...editor?.planning };
  let items = next.furniture_positions;
  const products: Product[] = editor?.cartProducts ?? [];
  let roommate = planning.roommates.find(r => r.id !== userId);
  if (mode !== "none" && editor && !roommate) {
    roommate = { id: crypto.randomUUID(), name: "Roommate", color: "#C0186F" };
    planning = { ...planning, roommates: [...planning.roommates, roommate] };
  }
  for (const f of next.furniture_positions) {
    const side = sideOf(f, extent, mode, mineFirst, axis);
    // Without a saved planner state there's nowhere to name a roommate yet; their side starts shared.
    const assignedTo = side === "me" ? userId : side === "them" && roommate ? roommate.id : "shared";
    const result = assignOwnership(items, planning, products, { itemId: f.id }, { assignedTo });
    items = result.furniture; planning = result.planning;
  }
  next.furniture_positions = items;
  if (editor) editor.planning = { ...planning, showOwners: mode !== "none" ? true : planning.showOwners };
  return next;
}
