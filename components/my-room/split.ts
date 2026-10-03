import type { SaveRoomRequest } from "@/lib/api-types";
import type { FurnitureItem, Product } from "@/lib/types";
import { assignOwnership, DEFAULT_PLANNING } from "@/lib/planning";
import { footprint } from "@/components/canvas/geometry";

export type SplitMode = "middle" | "beds" | "none";
export type Side = "me" | "them" | "shared";

/** Draw the line: which side of the room each piece starts on. Pieces that
 * straddle the line (or the middle strip when splitting by bed) start shared. */
export function sideOf(f: FurnitureItem, lengthFt: number, mode: SplitMode, mineLeft: boolean): Side {
  if (mode === "none") return "shared";
  const b = footprint(f), cx = b.x + b.w / 2;
  let left: boolean | null;
  if (mode === "middle") {
    const mid = lengthFt / 2;
    left = b.x < mid - 0.25 && b.x + b.w > mid + 0.25 ? null : cx < mid;
  } else {
    left = cx < lengthFt / 3 ? true : cx > (lengthFt * 2) / 3 ? false : null;
  }
  if (left === null) return "shared";
  return left === mineLeft ? "me" : "them";
}

/** The x positions of the line(s) for a split, in feet. */
export function lineXs(lengthFt: number, mode: SplitMode) {
  return mode === "middle" ? [lengthFt / 2] : mode === "beds" ? [lengthFt / 3, (lengthFt * 2) / 3] : [];
}

/** Apply a split to a workspace snapshot: my side is mine, the other side goes
 * to a "Roommate" placeholder (handed over once they join), the rest is shared.
 * Uses the same ownership ledger as the planner (furniture + product supply). */
export function applySplit(snapshot: SaveRoomRequest, userId: string, mode: SplitMode, mineLeft: boolean): SaveRoomRequest {
  const next = structuredClone(snapshot);
  const editor = next.room_dimensions.editor;
  let planning = { ...DEFAULT_PLANNING, ...editor?.planning };
  let items = next.furniture_positions;
  const products: Product[] = editor?.cartProducts ?? [];
  let roommate = planning.roommates.find(r => r.id !== userId);
  if (mode !== "none" && !roommate) {
    roommate = { id: crypto.randomUUID(), name: "Roommate", color: "#C0186F" };
    planning = { ...planning, roommates: [...planning.roommates, roommate] };
  }
  for (const f of next.furniture_positions) {
    const side = sideOf(f, next.room_dimensions.length_ft, mode, mineLeft);
    // Without a saved planner state there's nowhere to name a roommate yet; their side starts shared.
    const assignedTo = side === "me" ? userId : side === "them" && editor ? roommate!.id : "shared";
    const result = assignOwnership(items, planning, products, { itemId: f.id }, { assignedTo });
    items = result.furniture; planning = result.planning;
  }
  next.furniture_positions = items;
  if (editor) editor.planning = { ...planning, showOwners: mode !== "none" ? true : planning.showOwners };
  return next;
}
