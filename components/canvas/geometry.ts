// Geometry + layer rules for the room canvas. Coordinates are in feet,
// origin top-left, x along room length, y along room width (templates/README.md).
import type { ClosetRect, FurnitureItem, Point } from "@/lib/types";

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

// ---- Polygon (hand-drawn room) geometry -------------------------------------
// A drawn room is a closed rectilinear ring of Points (ft). These replace the
// simple `x + w <= roomL` bounds test with real polygon containment so an
// L-shaped room flags furniture that pokes across a wall or into a notch.

/** True if (px,py) is on the axis-aligned segment (ax,ay)-(bx,by), within eps. */
function onSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number, eps: number): boolean {
  if (Math.abs(ax - bx) < eps) {
    // vertical
    return Math.abs(px - ax) < eps && py >= Math.min(ay, by) - eps && py <= Math.max(ay, by) + eps;
  }
  if (Math.abs(ay - by) < eps) {
    // horizontal
    return Math.abs(py - ay) < eps && px >= Math.min(ax, bx) - eps && px <= Math.max(ax, bx) + eps;
  }
  return false;
}

/**
 * Ray-cast point-in-polygon; a point on the boundary counts as inside. Works
 * for any simple polygon, and is exact for the rectilinear rings we draw.
 */
export function pointInPolygon(px: number, py: number, poly: Point[], eps = 1e-6): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
    if (onSegment(px, py, xi, yi, xj, yj, eps)) return true;
    const crosses = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (crosses) inside = !inside;
  }
  return inside;
}

/** Does an axis-aligned polygon edge cut through the OPEN interior of a rect? */
function edgeCrossesRectInterior(ax: number, ay: number, bx: number, by: number, r: Footprint, eps = 1e-6): boolean {
  if (Math.abs(ax - bx) < eps) {
    // vertical edge at x = ax
    const yLo = Math.min(ay, by), yHi = Math.max(ay, by);
    return ax > r.x + eps && ax < r.x + r.w - eps && yHi > r.y + eps && yLo < r.y + r.h - eps;
  }
  // horizontal edge at y = ay
  const xLo = Math.min(ax, bx), xHi = Math.max(ax, bx);
  return ay > r.y + eps && ay < r.y + r.h - eps && xHi > r.x + eps && xLo < r.x + r.w - eps;
}

/**
 * True when the whole footprint sits inside the polygon: all four corners are
 * inside/on the ring AND no wall edge cuts across the rect (which would mean a
 * concave notch pokes into it). Exact for rectilinear rooms + axis-aligned
 * footprints.
 */
export function rectInsidePolygon(fp: Footprint, poly: Point[]): boolean {
  const corners: [number, number][] = [
    [fp.x, fp.y],
    [fp.x + fp.w, fp.y],
    [fp.x, fp.y + fp.h],
    [fp.x + fp.w, fp.y + fp.h],
  ];
  if (!corners.every(([x, y]) => pointInPolygon(x, y, poly))) return false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (edgeCrossesRectInterior(poly[j].x, poly[j].y, poly[i].x, poly[i].y, fp)) return false;
  }
  return true;
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
export function invalidItems(
  furniture: FurnitureItem[],
  roomL: number,
  roomW: number,
  /** Hand-drawn rooms: bounds become polygon containment, closets are obstacles. */
  outline?: { points: Point[]; closets?: ClosetRect[] } | null
): Set<string> {
  const bad = new Set<string>();
  const allSolids = furniture.filter((f) => layerOf(f) === "solid");
  const riders = riderIds(allSolids);
  const solids = allSolids.filter((f) => !riders.has(f.id));

  const eps = 1e-6;
  for (const f of furniture) {
    const fp = footprint(f);
    // Out of bounds: inside the drawn polygon, or inside the bbox rectangle.
    const outOfBounds = outline
      ? !rectInsidePolygon(fp, outline.points)
      : fp.x < -eps || fp.y < -eps || fp.x + fp.w > roomL + eps || fp.y + fp.h > roomW + eps;
    if (outOfBounds) bad.add(f.id);
  }

  // Closets are solid obstacles: a real (non-rider) piece overlapping one is a
  // clash, flagged like a furniture-furniture collision. Rugs/wall items slide
  // under or behind, so only solids are checked.
  for (const cl of outline?.closets ?? []) {
    const clo: Footprint = { x: cl.x_ft, y: cl.y_ft, w: cl.width_ft, h: cl.depth_ft };
    for (const f of solids) {
      if (overlaps(footprint(f), clo)) bad.add(f.id);
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
