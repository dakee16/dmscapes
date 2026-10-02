import type { FurnitureItem } from "@/lib/types";
import { footprint, layerOf, type Footprint } from "./geometry";

export interface Clearance {
  /** The gap as a segment in feet, from the piece's edge to the obstacle. */
  x1: number; y1: number; x2: number; y2: number;
  ft: number;
  kind: "door" | "wall" | "piece";
  name: string;
}

/**
 * The selected piece's nearest clearance, for the plan's dimension callout:
 * a door swing within reach first (it's what people trip on), otherwise the
 * tightest gap to a neighbouring piece or a wall. Axis-aligned footprints;
 * flush (touching) edges don't count as a gap.
 */
export function nearestClearance(item: FurnitureItem, others: FurnitureItem[], roomL: number, roomW: number, doors: Footprint[], nameOf: (f: FurnitureItem) => string): Clearance | null {
  const b = footprint(item);
  const rug = layerOf(item) === "rug";
  const found: Clearance[] = [];
  const consider = (o: Footprint, kind: Clearance["kind"], name: string) => {
    const ox = Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x);
    const oy = Math.min(b.y + b.h, o.y + o.h) - Math.max(b.y, o.y);
    if (ox > 0.1) {
      const mx = Math.max(b.x, o.x) + ox / 2;
      if (o.y >= b.y + b.h) found.push({ x1: mx, y1: b.y + b.h, x2: mx, y2: o.y, ft: o.y - (b.y + b.h), kind, name });
      else if (o.y + o.h <= b.y) found.push({ x1: mx, y1: o.y + o.h, x2: mx, y2: b.y, ft: b.y - (o.y + o.h), kind, name });
    }
    if (oy > 0.1) {
      const my = Math.max(b.y, o.y) + oy / 2;
      if (o.x >= b.x + b.w) found.push({ x1: b.x + b.w, y1: my, x2: o.x, y2: my, ft: o.x - (b.x + b.w), kind, name });
      else if (o.x + o.w <= b.x) found.push({ x1: o.x + o.w, y1: my, x2: b.x, y2: my, ft: b.x - (o.x + o.w), kind, name });
    }
  };
  for (const d of doors) consider(d, "door", "Door clears");
  if (!rug) {
    for (const f of others) {
      if (f.id === item.id || f.parent_id || f.parent_id === item.id || item.parent_id === f.id || layerOf(f) !== "solid") continue;
      consider(footprint(f), "piece", nameOf(f));
    }
  }
  const midX = b.x + b.w / 2, midY = b.y + b.h / 2;
  found.push(
    { x1: 0, y1: midY, x2: b.x, y2: midY, ft: b.x, kind: "wall", name: "Wall" },
    { x1: b.x + b.w, y1: midY, x2: roomL, y2: midY, ft: roomL - b.x - b.w, kind: "wall", name: "Wall" },
    { x1: midX, y1: 0, x2: midX, y2: b.y, ft: b.y, kind: "wall", name: "Wall" },
    { x1: midX, y1: b.y + b.h, x2: midX, y2: roomW, ft: roomW - b.y - b.h, kind: "wall", name: "Wall" },
  );
  const gaps = found.filter((c) => c.ft > 0.04);
  const door = gaps.filter((c) => c.kind === "door" && c.ft < 4).sort((a, z) => a.ft - z.ft)[0];
  if (door) return door;
  return gaps.filter((c) => c.ft < 8).sort((a, z) => a.ft - z.ft)[0] ?? null;
}
