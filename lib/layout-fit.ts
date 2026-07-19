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
  return f.rotation_deg === 90
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

function separateOverlaps(items: FurnitureItem[], roomL: number, roomW: number): void {
  const all = items.filter((f) => !COLLISION_EXEMPT_TYPES.has(f.type));

  // stacked companions (pillows on beds, bins under beds, lamps on desks)
  // ride with their carrier instead of joining the compaction
  const riders = new Map<FurnitureItem, { carrier: FurnitureItem; x: number; y: number }>();
  for (const f of all) {
    const r = rectOf(f);
    for (const c of all) {
      if (c === f || riders.has(c)) continue;
      const cr = rectOf(c);
      if (cr.w * cr.h > r.w * r.h && centerInside(r, cr)) {
        riders.set(f, { carrier: c, x: c.x_ft, y: c.y_ft });
        break;
      }
    }
  }

  const solids = all.filter((f) => !riders.has(f));
  // x/y interact when a pair overlaps in both axes; a second y pass settles it
  compactAxis(solids, "y", roomW);
  compactAxis(solids, "x", roomL);
  compactAxis(solids, "y", roomW);

  for (const [f, { carrier, x, y }] of riders) {
    f.x_ft = Math.round((f.x_ft + carrier.x_ft - x) * 100) / 100;
    f.y_ft = Math.round((f.y_ft + carrier.y_ft - y) * 100) / 100;
  }
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

  const fitted = furniture.map((f) => {
    const { w, h } = footprint(f);
    return {
      ...f,
      x_ft: fitAxis(f.x_ft, w, nominal.length, roomLengthFt),
      y_ft: fitAxis(f.y_ft, h, nominal.width, roomWidthFt),
    };
  });
  // compaction only helps when the template plausibly fits; below ~60% of
  // nominal the match is hopeless and shoving furniture just churns the
  // layout, so keep the proportional fit and let the canvas flag it
  if (roomLengthFt >= 0.6 * nominal.length && roomWidthFt >= 0.6 * nominal.width) {
    separateOverlaps(fitted, roomLengthFt, roomWidthFt);
  }
  return fitted;
}
