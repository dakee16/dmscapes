import type { FurnitureItem, RoomOutline } from "./types";
import { pointInPolygon, rectInsidePolygon } from "@/components/canvas/geometry";

/**
 * Auto-place a furniture set inside a hand-drawn (rectilinear) room.
 *
 * The rectangular template system (lib/layout-fit) assumes a box with a fixed
 * door/window, so it can't lay out an L / T / U shape. This places furniture
 * against the room's actual walls instead:
 *   - beds go on the longest walls,
 *   - desks on the wall that has the window,
 *   - dressers and the floor odds-and-ends take the remaining wall runs,
 *   - the rug centers in the largest open floor area,
 *   - desk chairs sit just in front of their desk,
 *   - riders (pillows, under-bed bins, desk lamp) ride their carrier.
 *
 * The `template` argument is only a parts list: which pieces exist (right count
 * for the occupancy) and their real footprints. We keep those and recompute
 * position + rotation. Everything downstream (drag, rotate, collision flags,
 * product matching) is unchanged.
 *
 * ponytail: greedy wall-slot heuristic, not an optimizer. Each wall run is
 * handed out once so wall pieces never overlap; the result is a sane starting
 * point the user then drags. Upgrade to a real 2D packer only if hand-tuning
 * proves too fiddly for common shapes.
 */

const WALL_MOUNT = new Set(["string_lights", "wall_decor", "mirror", "power_strip"]);
const RIDER_EXEMPT = new Set(["rug", "string_lights", "wall_decor", "power_strip", "mirror"]);
const MIN_WALL_FT = 2;
const DOOR_CLEAR_FT = 0.6;

const round2 = (v: number) => Math.round(v * 100) / 100;

interface Rect { x: number; y: number; w: number; h: number }

/** Footprint (x/y extents) a piece would have at rotation `rot` (0/90/180/270). */
function dims(f: FurnitureItem, rot: number): { w: number; h: number } {
  const swap = ((rot % 180) + 180) % 180 === 90;
  return swap ? { w: f.length_ft, h: f.width_ft } : { w: f.width_ft, h: f.length_ft };
}
const rectOf = (f: FurnitureItem): Rect => ({ x: f.x_ft, y: f.y_ft, ...dims(f, f.rotation_deg) });

function centerInside(inner: Rect, outer: Rect): boolean {
  const cx = inner.x + inner.w / 2, cy = inner.y + inner.h / 2;
  return cx >= outer.x && cx <= outer.x + outer.w && cy >= outer.y && cy <= outer.y + outer.h;
}

function overlaps(a: Rect, b: Rect, eps = 1e-6): boolean {
  return a.x < b.x + b.w - eps && b.x < a.x + a.w - eps && a.y < b.y + b.h - eps && b.y < a.y + a.h - eps;
}

/** Small solids sitting centered inside a larger solid: pillows, bins, lamp. */
function findRiders(parts: FurnitureItem[]): Map<string, string> {
  const riders = new Map<string, string>();
  const solids = parts.filter((f) => !RIDER_EXEMPT.has(f.type));
  for (const f of solids) {
    const rf = rectOf(f);
    for (const c of solids) {
      if (c === f) continue;
      const rc = rectOf(c);
      if (rc.w * rc.h > rf.w * rf.h && centerInside(rf, rc)) {
        riders.set(f.id, c.id);
        break;
      }
    }
  }
  return riders;
}

interface Wall {
  horizontal: boolean;
  coord: number; // y for a horizontal wall, x for a vertical one
  lo: number;
  len: number;
  inSign: 1 | -1; // which way (along the perpendicular axis) is into the room
  hasWindow: boolean;
  free: [number, number][]; // unused runs, local coords 0..len
}

function subtract(ints: [number, number][], cut: [number, number]): [number, number][] {
  const [ds, de] = cut;
  const out: [number, number][] = [];
  for (const [s, e] of ints) {
    if (de <= s || ds >= e) { out.push([s, e]); continue; }
    if (ds > s) out.push([s, Math.min(ds, e)]);
    if (de < e) out.push([Math.max(de, s), e]);
  }
  return out.filter(([s, e]) => e - s > 0.01);
}

function buildWalls(outline: RoomOutline): Wall[] {
  const p = outline.points, n = p.length;
  const walls: Wall[] = [];
  for (let i = 0; i < n; i++) {
    const a = p[i], b = p[(i + 1) % n];
    const horizontal = Math.abs(a.y - b.y) < 1e-6;
    const vertical = Math.abs(a.x - b.x) < 1e-6;
    if (!horizontal && !vertical) continue;
    const len = horizontal ? Math.abs(b.x - a.x) : Math.abs(b.y - a.y);
    if (len < MIN_WALL_FT) continue;
    const coord = horizontal ? a.y : a.x;
    const lo = horizontal ? Math.min(a.x, b.x) : Math.min(a.y, b.y);
    const mid = horizontal ? (a.x + b.x) / 2 : (a.y + b.y) / 2;
    const inSign: 1 | -1 = horizontal
      ? (pointInPolygon(mid, coord + 0.1, p) ? 1 : -1)
      : (pointInPolygon(coord + 0.1, mid, p) ? 1 : -1);

    let free: [number, number][] = [[0, len]];
    for (const op of outline.openings) {
      if (op.edge !== i) continue;
      const dir = horizontal ? Math.sign(b.x - a.x) : Math.sign(b.y - a.y);
      const from = (horizontal ? a.x : a.y) + dir * op.offset_ft - lo;
      const to = from + dir * op.width_ft;
      const iv: [number, number] = [Math.min(from, to), Math.max(from, to)];
      if (op.kind === "door") free = subtract(free, [iv[0] - DOOR_CLEAR_FT, iv[1] + DOOR_CLEAR_FT]);
    }
    const hasWindow = outline.openings.some((op) => op.edge === i && op.kind === "window");
    walls.push({ horizontal, coord, lo, len, inSign, hasWindow, free });
  }
  return walls;
}

const freeLen = (w: Wall) => w.free.reduce((s, [a, b]) => s + (b - a), 0);

/** Orientation so the piece's longer footprint side runs along the wall. */
function orientFor(f: FurnitureItem, horizontal: boolean): number {
  const lengthIsLong = f.length_ft >= f.width_ft;
  return horizontal ? (lengthIsLong ? 90 : 0) : lengthIsLong ? 0 : 90;
}

function worldPos(wall: Wall, start: number, w: number, h: number): { x: number; y: number } {
  if (wall.horizontal) {
    return { x: wall.lo + start, y: wall.inSign > 0 ? wall.coord : wall.coord - h };
  }
  return { x: wall.inSign > 0 ? wall.coord : wall.coord - w, y: wall.lo + start };
}

/**
 * Place `f` flush against the best available wall, sliding it along the wall
 * past anything already placed so pieces on perpendicular walls don't collide
 * at the shared corner. Returns the wall used and records the footprint.
 */
function placeOnWall(
  f: FurnitureItem,
  walls: Wall[],
  placed: Rect[],
  opts: { window?: boolean; allowOverlap?: boolean } = {}
): Wall | null {
  const ordered = walls.slice().sort((a, b) => {
    if (opts.window && a.hasWindow !== b.hasWindow) return a.hasWindow ? -1 : 1;
    return freeLen(b) - freeLen(a);
  });
  for (const wall of ordered) {
    const rot = orientFor(f, wall.horizontal);
    const { w, h } = dims(f, rot);
    const along = wall.horizontal ? w : h;
    for (const [s, e] of wall.free) {
      for (let p = s; p + along <= e + 1e-6; p += 0.5) {
        const { x, y } = worldPos(wall, p, w, h);
        const rect: Rect = { x, y, w, h };
        if (placed.some((r) => overlaps(rect, r))) continue;
        wall.free = subtract(wall.free, [p, p + along]);
        f.rotation_deg = rot; f.x_ft = round2(x); f.y_ft = round2(y);
        placed.push(rect);
        return wall;
      }
    }
  }
  if (opts.allowOverlap && ordered.length) {
    // Thin wall-mounted item (mirror, lights): sit flush on the longest wall
    // even over a furniture run, since these never collide.
    const wall = ordered[0];
    const rot = orientFor(f, wall.horizontal);
    const { w, h } = dims(f, rot);
    const { x, y } = worldPos(wall, 0, w, h);
    f.rotation_deg = rot; f.x_ft = round2(x); f.y_ft = round2(y);
    return wall;
  }
  return null;
}

function placeChair(
  chair: FurnitureItem,
  desk: FurnitureItem | undefined,
  wall: Wall | undefined,
  poly: RoomOutline["points"]
) {
  if (!desk || !wall) return;
  const dd = dims(desk, desk.rotation_deg);
  const cd = dims(chair, 0);
  const cx = desk.x_ft + dd.w / 2, cy = desk.y_ft + dd.h / 2;
  const ix = wall.horizontal ? 0 : wall.inSign;
  const iy = wall.horizontal ? wall.inSign : 0;
  const deskDepth = wall.horizontal ? dd.h : dd.w;
  const gap = 0.35;
  const centerX = cx + ix * (deskDepth / 2 + gap + cd.w / 2);
  const centerY = cy + iy * (deskDepth / 2 + gap + cd.h / 2);
  chair.rotation_deg = 0;
  chair.x_ft = round2(centerX - cd.w / 2);
  chair.y_ft = round2(centerY - cd.h / 2);
  // If it landed outside the room (a chair pushed into a notch wall), tuck it
  // back onto the desk footprint so it stays in bounds.
  if (!rectInsidePolygon({ x: chair.x_ft, y: chair.y_ft, w: cd.w, h: cd.h }, poly)) {
    chair.x_ft = round2(cx - cd.w / 2);
    chair.y_ft = round2(cy - cd.h / 2);
  }
}

function placeRug(rug: FurnitureItem, poly: RoomOutline["points"], L: number, W: number) {
  const { w, h } = dims(rug, rug.rotation_deg);
  // Interior target: the mean of the room's inside sample points, so an L-shape
  // pulls the rug toward its bulk rather than the (possibly missing) bbox center.
  let sx = 0, sy = 0, n = 0;
  for (let x = 0.5; x < L; x += 1) for (let y = 0.5; y < W; y += 1) {
    if (pointInPolygon(x, y, poly)) { sx += x; sy += y; n++; }
  }
  const tx = n ? sx / n : L / 2, ty = n ? sy / n : W / 2;
  let best: { x: number; y: number } | null = null, bestD = Infinity;
  for (let x = 0; x <= L - w + 1e-6; x += 0.5) for (let y = 0; y <= W - h + 1e-6; y += 0.5) {
    if (!rectInsidePolygon({ x, y, w, h }, poly)) continue;
    const d = (x + w / 2 - tx) ** 2 + (y + h / 2 - ty) ** 2;
    if (d < bestD) { bestD = d; best = { x, y }; }
  }
  if (best) { rug.x_ft = round2(best.x); rug.y_ft = round2(best.y); }
}

function reseatRider(rider: FurnitureItem, carrier: FurnitureItem) {
  const rd = dims(rider, rider.rotation_deg), cd = dims(carrier, carrier.rotation_deg);
  rider.x_ft = round2(carrier.x_ft + cd.w / 2 - rd.w / 2);
  rider.y_ft = round2(carrier.y_ft + cd.h / 2 - rd.h / 2);
}

export function placeInPolygon(
  template: FurnitureItem[],
  outline: RoomOutline,
  lengthFt: number,
  widthFt: number
): FurnitureItem[] {
  const parts = template.map((f) => ({ ...f }));
  const poly = outline.points;
  const riders = findRiders(parts);
  const walls = buildWalls(outline);

  const beds: FurnitureItem[] = [], desks: FurnitureItem[] = [], chairs: FurnitureItem[] = [];
  const dressers: FurnitureItem[] = [], others: FurnitureItem[] = [], wallItems: FurnitureItem[] = [];
  const rugs: FurnitureItem[] = [];
  for (const f of parts) {
    if (riders.has(f.id)) continue;
    if (f.type === "bed") beds.push(f);
    else if (f.type === "desk") desks.push(f);
    else if (f.type === "desk_chair") chairs.push(f);
    else if (f.type === "dresser") dressers.push(f);
    else if (f.type === "rug") rugs.push(f);
    else if (WALL_MOUNT.has(f.type)) wallItems.push(f);
    else others.push(f);
  }

  const placed: Rect[] = [];
  const deskWall = new Map<string, Wall>();
  for (const b of beds) placeOnWall(b, walls, placed);
  for (const d of desks) {
    const w = placeOnWall(d, walls, placed, { window: true });
    if (w) deskWall.set(d.id, w);
  }
  for (const dr of dressers) placeOnWall(dr, walls, placed);
  for (const o of others) placeOnWall(o, walls, placed);
  for (const wi of wallItems) placeOnWall(wi, walls, placed, { allowOverlap: true });

  for (const c of chairs) {
    const desk = desks.find((d) => d.owner === c.owner) ?? desks[0];
    placeChair(c, desk, desk ? deskWall.get(desk.id) : undefined, poly);
  }
  for (const r of rugs) placeRug(r, poly, lengthFt, widthFt);
  for (const f of parts) {
    const carrierId = riders.get(f.id);
    if (!carrierId) continue;
    const carrier = parts.find((x) => x.id === carrierId);
    if (carrier) reseatRider(f, carrier);
  }
  return parts;
}
