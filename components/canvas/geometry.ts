// Geometry + layer rules for the room canvas. Coordinates are in feet,
// origin top-left, x along room length, y along room width (templates/README.md).
import type { ClosetRect, FurnitureItem, Point } from "@/lib/types";

export interface Footprint {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const normalizeRotation = (degrees: number): number => ((degrees % 360) + 360) % 360;

function rotationAxes(degrees: number) {
  const angle = normalizeRotation(degrees) * Math.PI / 180;
  // Exact quarter turns keep existing layouts and repeated rotations stable.
  const clean = (v: number) => Math.abs(v) < 1e-12 ? 0 : v;
  return { cos: clean(Math.cos(angle)), sin: clean(Math.sin(angle)) };
}

/** Axis-aligned bounds; saved x/y remain their top-left at every angle. */
export function footprint(f: FurnitureItem): Footprint {
  const { cos, sin } = rotationAxes(f.rotation_deg);
  const w = Math.abs(cos) * f.width_ft + Math.abs(sin) * f.length_ft;
  const h = Math.abs(sin) * f.width_ft + Math.abs(cos) * f.length_ft;
  return { x: f.x_ft, y: f.y_ft, w, h };
}

export function rectCorners({ x, y, w, h }: Footprint): Point[] {
  return [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
}

export function furnitureCorners(f: FurnitureItem): Point[] {
  const b = footprint(f), { cos, sin } = rotationAxes(f.rotation_deg);
  return rectCorners({ x: -f.width_ft / 2, y: -f.length_ft / 2, w: f.width_ft, h: f.length_ft })
    .map(p => ({ x: b.x + b.w / 2 + p.x * cos - p.y * sin, y: b.y + b.h / 2 + p.x * sin + p.y * cos }));
}

/** Room coordinates in the furniture's unrotated, center-based frame. */
export function furnitureLocalPoint(f: FurnitureItem, p: Point): Point {
  const b = footprint(f), { cos, sin } = rotationAxes(f.rotation_deg);
  const dx = p.x - b.x - b.w / 2, dy = p.y - b.y - b.h / 2;
  return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
}

export function furnitureContainsPoint(f: FurnitureItem, p: Point): boolean {
  const local = furnitureLocalPoint(f, p);
  return Math.abs(local.x) <= f.width_ft / 2 + 1e-6 && Math.abs(local.y) <= f.length_ft / 2 + 1e-6;
}

/** Separating-axis test for convex footprints; touching edges are allowed. */
export function polygonsOverlap(a: Point[], b: Point[], eps = 1e-6): boolean {
  for (const polygon of [a, b]) {
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i], q = polygon[(i + 1) % polygon.length];
      const length = Math.hypot(q.x - p.x, q.y - p.y);
      const nx = -(q.y - p.y) / length, ny = (q.x - p.x) / length;
      const pa = a.map(v => v.x * nx + v.y * ny), pb = b.map(v => v.x * nx + v.y * ny);
      if (Math.max(...pa) <= Math.min(...pb) + eps || Math.max(...pb) <= Math.min(...pa) + eps) return false;
    }
  }
  return true;
}

export function furnitureInsidePolygon(f: FurnitureItem, polygon: Point[]): boolean {
  return rectInsidePolygon({ x: -f.width_ft / 2, y: -f.length_ft / 2, w: f.width_ft, h: f.length_ft },
    polygon.map(p => furnitureLocalPoint(f, p)));
}

/** Rotate a piece and its bounds around a shared pivot without grid snapping. */
export function rotateFurniture(f: FurnitureItem, degrees: number, pivot: Point): FurnitureItem {
  const before = footprint(f), { cos, sin } = rotationAxes(degrees);
  const next = { ...f, rotation_deg: normalizeRotation(f.rotation_deg + degrees) };
  const after = footprint(next);
  const dx = before.x + before.w / 2 - pivot.x, dy = before.y + before.h / 2 - pivot.y;
  return { ...next, x_ft: pivot.x + dx * cos - dy * sin - after.w / 2,
    y_ft: pivot.y + dx * sin + dy * cos - after.h / 2 };
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

/** Only real accessories can ride furniture; overlapping desks are collisions. */
export function furnitureHost(f: FurnitureItem, items: FurnitureItem[]): FurnitureItem | undefined {
  const hostTypes: Record<string, string[]> = {
    desk_lamp: ["desk", "dresser"], throw_pillows: ["bed", "bunk"], storage_bins: ["bed", "bunk"],
  };
  const types = hostTypes[f.type];
  const b = footprint(f);
  return items.find(c => c.id !== f.id && (f.parent_id === c.id ||
    (types?.includes(c.type) && furnitureContainsPoint(c, { x: b.x + b.w / 2, y: b.y + b.h / 2 }) &&
      c.width_ft * c.length_ft > f.width_ft * f.length_ft)));
}

// ---- Polygon (hand-drawn room) geometry -------------------------------------
// A drawn room is a closed rectilinear ring of Points (ft). These replace the
// simple `x + w <= roomL` bounds test with real polygon containment so an
// L-shaped room flags furniture that pokes across a wall or into a notch.

/** True if (px,py) is on a segment at any angle, within eps. */
function onSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number, eps: number): boolean {
  const dx = bx - ax, dy = by - ay, length = Math.hypot(dx, dy);
  if (length < eps) return Math.hypot(px - ax, py - ay) <= eps;
  return Math.abs((px - ax) * dy - (py - ay) * dx) <= eps * length &&
    px >= Math.min(ax, bx) - eps && px <= Math.max(ax, bx) + eps &&
    py >= Math.min(ay, by) - eps && py <= Math.max(ay, by) + eps;
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

/** Does a polygon edge cut through the OPEN interior of a rect? Any angle. */
function edgeCrossesRectInterior(ax: number, ay: number, bx: number, by: number, r: Footprint, eps = 1e-6): boolean {
  // Liang-Barsky clip of segment a->b to the OPEN interior of the rect. Works for
  // diagonal walls too; an edge merely flush with a rect side is excluded, so
  // furniture sitting against a wall is not a "crossing".
  const x0 = r.x + eps, x1 = r.x + r.w - eps, y0 = r.y + eps, y1 = r.y + r.h - eps;
  if (x1 <= x0 || y1 <= y0) return false; // rect too small to have an interior
  const dx = bx - ax, dy = by - ay;
  let t0 = 0, t1 = 1;
  const clip = (p: number, q: number): boolean => {
    if (Math.abs(p) < 1e-12) return q >= 0; // parallel to this edge: inside iff q>=0
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      if (t > t0) t0 = t;
    } else {
      if (t < t0) return false;
      if (t < t1) t1 = t;
    }
    return true;
  };
  if (clip(-dx, ax - x0) && clip(dx, x1 - ax) && clip(-dy, ay - y0) && clip(dy, y1 - ay)) {
    return t1 - t0 > eps; // a non-degenerate portion lies strictly inside
  }
  return false;
}

/**
 * True when the whole footprint sits inside the polygon: all four corners are
 * inside/on the ring AND no wall edge cuts across the rect (which would mean a
 * concave notch pokes into it). Handles diagonal walls as well.
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
  return new Set(solids.filter(f => furnitureHost(f, solids)).map(f => f.id));
}

/**
 * Ids of items that are out of bounds or colliding.
 * Rules: only solid, non-rider items collide. Containment alone must not hide
 * furniture collisions; furnitureHost recognizes real attachments.
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
      ? !furnitureInsidePolygon(f, outline.points)
      : fp.x < -eps || fp.y < -eps || fp.x + fp.w > roomL + eps || fp.y + fp.h > roomW + eps;
    if (outOfBounds) bad.add(f.id);
  }

  // Closets are solid obstacles: a real (non-rider) piece overlapping one is a
  // clash, flagged like a furniture-furniture collision. Rugs/wall items slide
  // under or behind, so only solids are checked.
  for (const cl of outline?.closets ?? []) {
    const clo: Footprint = { x: cl.x_ft, y: cl.y_ft, w: cl.width_ft, h: cl.depth_ft };
    for (const f of solids) {
      if (polygonsOverlap(furnitureCorners(f), rectCorners(clo))) bad.add(f.id);
    }
  }

  for (let i = 0; i < solids.length; i++) {
    for (let j = i + 1; j < solids.length; j++) {
      if (!polygonsOverlap(furnitureCorners(solids[i]), furnitureCorners(solids[j]))) continue;
      bad.add(solids[i].id);
      bad.add(solids[j].id);
    }
  }
  return bad;
}
