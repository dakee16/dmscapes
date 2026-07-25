import type { FurnitureItem } from "./types";

/**
 * Templates are authored at a nominal room size but match a *range* of rooms
 * (room_constraints). Rendering authored coordinates into a differently-sized
 * room pushes furniture through walls. This refits positions:
 *  - items hugging a wall in the template stay anchored to that wall
 *  - everything else keeps its proportional center
 *  - footprints are never resized (real furniture!), only repositioned
 */

/** Authored room size per template (see templates/gen_templates.py). */
export const TEMPLATE_NOMINAL_DIMS: Record<string, { length: number; width: number }> = {
  "standard-double-15x12-v1": { length: 15, width: 12 },
  "compact-square-double-12x11-v1": { length: 12, width: 11 },
  "long-double-17x10-v1": { length: 17, width: 10.5 },
  "small-single-11x9-v1": { length: 11, width: 8.8 },
  "compact-double-bunked-12x10-v1": { length: 12.4, width: 10 },
  "large-square-double-16x15-v1": { length: 16, width: 15 },
  "suite-large-25x15-v1": { length: 25, width: 15 },
  "wide-double-18x13-v1": { length: 18, width: 13 },
  "corridor-double-24x8-v1": { length: 24, width: 8.5 },
  "corridor-single-23x8-v1": { length: 23, width: 8 },
  "compact-triple-bunked-13x12-v1": { length: 13, width: 12 },
  "standard-triple-17x16-v1": { length: 17, width: 16 },
  "long-triple-27x14-v1": { length: 27, width: 14 },
  "compact-quad-bunked-15x13-v1": { length: 15, width: 13 },
  "standard-quad-25x17-v1": { length: 25, width: 17 },
  "long-quad-33x14-v1": { length: 33, width: 14 },
};

/** Items within this distance of a wall are treated as anchored to it. */
const WALL_HUG_FT = 0.6;

/** Non-colliding layers; keep in sync with components/canvas/geometry.ts. */
const COLLISION_EXEMPT_TYPES = new Set([
  "rug",
  "string_lights",
  "wall_decor",
  "power_strip",
  "mirror",
]);

function footprint(f: FurnitureItem): { w: number; h: number } {
  // mod 180: user rotation covers full quarter turns (0/90/180/270)
  return f.rotation_deg % 180 === 90
    ? { w: f.length_ft, h: f.width_ft }
    : { w: f.width_ft, h: f.length_ft };
}

function fitAxis(pos: number, size: number, tplExtent: number, roomExtent: number): number {
  const gapNear = pos;
  const gapFar = tplExtent - (pos + size);
  let next: number;
  if (gapNear <= WALL_HUG_FT && gapNear <= gapFar) {
    next = gapNear; // anchored to near wall; keep the exact clearance
  } else if (gapFar <= WALL_HUG_FT) {
    next = roomExtent - size - gapFar; // anchored to far wall
  } else {
    const center = (pos + size / 2) / tplExtent;
    next = center * roomExtent - size / 2;
  }
  // clamp inside; oversized items sit at 0 and get red-flagged by the canvas
  return Math.round(Math.max(0, Math.min(next, roomExtent - size)) * 100) / 100;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const rectOf = (f: FurnitureItem): Rect => {
  const { w, h } = footprint(f);
  return { x: f.x_ft, y: f.y_ft, w, h };
};

/** Stacked-item exemption (pillows on beds, bins under beds), as in the canvas. */
function centerInside(inner: Rect, outer: Rect): boolean {
  const cx = inner.x + inner.w / 2;
  const cy = inner.y + inner.h / 2;
  return cx >= outer.x && cx <= outer.x + outer.w && cy >= outer.y && cy <= outer.y + outer.h;
}

/**
 * Wall-anchored and proportionally-placed items shift at different rates when
 * the room shrinks, which can open overlaps between former neighbors — often
 * whole rows that must compress against both walls at once. Per axis, build
 * the ordering constraints between items whose cross-axis intervals overlap
 * (skipping pairs that are stacked or better separated on the other axis) and
 * compact: a forward sweep holds each item at its fitted position unless a
 * predecessor pushes it, then a backward sweep from the far wall absorbs any
 * overflow by shrinking wall clearances. Infeasible chains clamp at zero and
 * stay red-flagged by the canvas.
 */
function compactAxis(solids: FurnitureItem[], axis: "x" | "y", extent: number): void {
  const eps = 1e-6;
  const rects = solids.map(rectOf);
  const pos = rects.map((r) => (axis === "x" ? r.x : r.y));
  const size = rects.map((r) => (axis === "x" ? r.w : r.h));
  const crossPos = rects.map((r) => (axis === "x" ? r.y : r.x));
  const crossSize = rects.map((r) => (axis === "x" ? r.h : r.w));

  const order = solids
    .map((_, i) => i)
    .sort((a, b) => pos[a] + size[a] / 2 - (pos[b] + size[b] / 2) || a - b);

  // edge u->v (u earlier on axis) when the pair must not overlap on this axis
  const preds: number[][] = solids.map(() => []);
  for (let oi = 0; oi < order.length; oi++) {
    for (let oj = oi + 1; oj < order.length; oj++) {
      const u = order[oi];
      const v = order[oj];
      const cross =
        Math.min(crossPos[u] + crossSize[u], crossPos[v] + crossSize[v]) -
        Math.max(crossPos[u], crossPos[v]);
      if (cross <= eps) continue; // separated on the other axis already
      const along =
        Math.min(pos[u] + size[u], pos[v] + size[v]) - Math.max(pos[u], pos[v]);
      if (along > eps) {
        // currently colliding: only resolve here if this is the cheaper axis
        if (cross < along) continue;
        if (centerInside(rects[u], rects[v]) || centerInside(rects[v], rects[u])) continue;
      }
      preds[v].push(u);
    }
  }

  for (const v of order) {
    for (const u of preds[v]) pos[v] = Math.max(pos[v], pos[u] + size[u]);
  }
  const succMin = solids.map(() => Infinity);
  for (let k = order.length - 1; k >= 0; k--) {
    const u = order[k];
    pos[u] = Math.min(pos[u], extent - size[u], succMin[u] - size[u]);
    pos[u] = Math.max(0, pos[u]);
    for (const p of preds[u]) succMin[p] = Math.min(succMin[p], pos[u]);
  }

  solids.forEach((f, i) => {
    const next = Math.round(pos[i] * 100) / 100;
    if (axis === "x") f.x_ft = next;
    else f.y_ft = next;
  });
}

/**
 * A stacked companion (pillows on a bed, bins under it, a lamp on a desk) and
 * the offset from its carrier's origin in the authored layout. Footprints never
 * resize, so replaying that exact offset onto the carrier's refitted position
 * keeps the rider glued to its carrier instead of being fitted independently
 * (which drifted it off the bed, sometimes clear out of the room).
 */
interface Rider {
  id: string;
  carrierId: string;
  dx: number;
  dy: number;
}

/**
 * In the authored layout, find each rider (smaller item centered inside a
 * larger solid) and record its offset from that carrier. Detection runs on the
 * ORIGINAL coordinates so the offset is the true authored one.
 */
function findRiders(furniture: FurnitureItem[]): Map<string, Rider> {
  const riders = new Map<string, Rider>();
  const solids = furniture.filter((f) => !COLLISION_EXEMPT_TYPES.has(f.type));
  for (const f of solids) {
    const r = rectOf(f);
    for (const c of solids) {
      if (c === f) continue;
      const cr = rectOf(c);
      if (cr.w * cr.h > r.w * r.h && centerInside(r, cr)) {
        riders.set(f.id, { id: f.id, carrierId: c.id, dx: f.x_ft - c.x_ft, dy: f.y_ft - c.y_ft });
        break;
      }
    }
  }
  return riders;
}

export function fitTemplateToRoom(
  furniture: FurnitureItem[],
  templateId: string,
  roomLengthFt: number,
  roomWidthFt: number
): FurnitureItem[] {
  const nominal = TEMPLATE_NOMINAL_DIMS[templateId];
  if (!nominal) return furniture.map((f) => ({ ...f }));
  const sameL = Math.abs(nominal.length - roomLengthFt) < 0.01;
  const sameW = Math.abs(nominal.width - roomWidthFt) < 0.01;
  if (sameL && sameW) return furniture.map((f) => ({ ...f }));

  const riders = findRiders(furniture);

  const fitted = furniture.map((f) => {
    const { w, h } = footprint(f);
    return {
      ...f,
      x_ft: fitAxis(f.x_ft, w, nominal.length, roomLengthFt),
      y_ft: fitAxis(f.y_ft, h, nominal.width, roomWidthFt),
    };
  });
  const byId = new Map(fitted.map((f) => [f.id, f]));

  // Compaction only helps when the template plausibly fits; below ~60% of
  // nominal the match is hopeless and shoving furniture just churns the
  // layout, so keep the proportional fit and let the canvas flag it. Riders
  // are excluded here and reseated on their carriers afterward.
  if (roomLengthFt >= 0.6 * nominal.length && roomWidthFt >= 0.6 * nominal.width) {
    const solids = fitted.filter(
      (f) => !COLLISION_EXEMPT_TYPES.has(f.type) && !riders.has(f.id)
    );
    // x and y interact: separating on one axis can reopen an overlap on the
    // other, so alternate passes until the layout stops changing (or a small
    // cap). Tight rooms need several rounds to unwind a 2D interlock; roomy
    // ones converge in one.
    for (let pass = 0; pass < 6; pass++) {
      const before = solids.map((f) => `${f.x_ft},${f.y_ft}`).join("|");
      compactAxis(solids, "y", roomWidthFt);
      compactAxis(solids, "x", roomLengthFt);
      if (solids.map((f) => `${f.x_ft},${f.y_ft}`).join("|") === before) break;
    }
  }

  // Reseat riders rigidly on their (possibly moved) carrier, clamped so a rider
  // can never end up out of bounds even when the room is smaller than nominal.
  for (const rider of riders.values()) {
    const f = byId.get(rider.id);
    const carrier = byId.get(rider.carrierId);
    if (!f || !carrier) continue;
    const { w, h } = footprint(f);
    f.x_ft = Math.round(Math.max(0, Math.min(carrier.x_ft + rider.dx, roomLengthFt - w)) * 100) / 100;
    f.y_ft = Math.round(Math.max(0, Math.min(carrier.y_ft + rider.dy, roomWidthFt - h)) * 100) / 100;
  }
  return fitted;
}
