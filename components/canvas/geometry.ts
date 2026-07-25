// Geometry + layer rules for the room canvas. Coordinates are in feet,
// origin top-left, x along room length, y along room width (templates/README.md).
import type { FurnitureItem } from "@/lib/types";

export interface Footprint {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Axis-aligned footprint. Templates author 0/90; the rotate controls extend
 * that to full quarter turns, so rotation mod 180 decides the axis swap.
 */
export function footprint(f: FurnitureItem): Footprint {
  const swap = f.rotation_deg % 180 === 90;
  const w = swap ? f.length_ft : f.width_ft;
  const h = swap ? f.width_ft : f.length_ft;
  return { x: f.x_ft, y: f.y_ft, w, h };
}

/** Wall-mounted items: thin, hug walls, never collide. */
const WALL_TYPES = new Set(["string_lights", "wall_decor", "power_strip", "mirror"]);
/** Floor layer rendered under everything, exempt from collision. */
const RUG_TYPES = new Set(["rug"]);

export type CanvasLayer = "rug" | "wall" | "solid";

export function layerOf(f: FurnitureItem): CanvasLayer {
  if (RUG_TYPES.has(f.type)) return "rug";
  if (WALL_TYPES.has(f.type)) return "wall";
  return "solid";
}

export const snapHalfFt = (v: number): number => Math.round(v * 2) / 2;

export function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function overlaps(a: Footprint, b: Footprint, eps = 1e-6): boolean {
  return a.x < b.x + b.w - eps && b.x < a.x + a.w - eps && a.y < b.y + b.h - eps && b.y < a.y + a.h - eps;
}

function centerInside(inner: Footprint, outer: Footprint): boolean {
  const cx = inner.x + inner.w / 2;
  const cy = inner.y + inner.h / 2;
  return cx >= outer.x && cx <= outer.x + outer.w && cy >= outer.y && cy <= outer.y + outer.h;
}

/**
 * A rider is a small solid that sits centered inside a larger solid: pillows on
 * a bed, a lamp on a desk, bins tucked under a bed. Riders tuck onto their host
 * and are never treated as colliding with anything (they are excluded from the
 * refit compaction too, in lib/layout-fit.ts), so a bin poking toward a dresser
 * is not a real overlap.
 */
function riderIds(solids: FurnitureItem[]): Set<string> {
  const riders = new Set<string>();
  for (const f of solids) {
    const r = footprint(f);
    for (const c of solids) {
      if (c === f) continue;
      const cr = footprint(c);
      if (cr.w * cr.h > r.w * r.h && centerInside(r, cr)) {
        riders.add(f.id);
        break;
      }
    }
  }
  return riders;
}

/**
 * Ids of items that are out of bounds or colliding.
 * Rules: only solid, non-rider items collide; a pair is additionally exempt
 * when either center sits inside the other (belt and suspenders for riders).
 */
export function invalidItems(furniture: FurnitureItem[], roomL: number, roomW: number): Set<string> {
  const bad = new Set<string>();
  const allSolids = furniture.filter((f) => layerOf(f) === "solid");
  const riders = riderIds(allSolids);
  const solids = allSolids.filter((f) => !riders.has(f.id));

  for (const f of furniture) {
    const fp = footprint(f);
    const eps = 1e-6;
    if (fp.x < -eps || fp.y < -eps || fp.x + fp.w > roomL + eps || fp.y + fp.h > roomW + eps) {
      bad.add(f.id);
    }
  }
  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      const a = footprint(solids[i]);
      const b = footprint(solids[j]);
      if (!overlaps(a, b)) continue;
      if (centerInside(a, b) || centerInside(b, a)) continue;
      bad.add(solids[i].id);
      bad.add(solids[j].id);
    }
  }
  return bad;
}
