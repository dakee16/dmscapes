import type { FittedRoom } from "./room-preview";
import { footprint } from "@/components/canvas/geometry";

/** Standard US area-rug sizes in feet, short side first, smallest first. */
export const RUG_SIZES: [number, number][] = [
  [2, 3],
  [3, 5],
  [4, 6],
  [5, 7],
  [5, 8],
  [6, 9],
  [8, 10],
  [9, 12],
];

/** A rug placed in the room: w along the room's length (x), l along its width (y), all in feet. */
export interface PlacedRug {
  size: [number, number];
  x: number;
  y: number;
  w: number;
  l: number;
}

const STEP = 0.25; // grid resolution, ft
// Chairs slide out of the way, so a rug can run under them.
const MOVABLE = new Set(["desk_chair", "chair"]);

/** Free/blocked grid of the room's floor: furniture footprints and the door swing are blocked. */
function floorGrid(fit: FittedRoom) {
  const cols = Math.floor(fit.lengthFt / STEP + 1e-6);
  const rows = Math.floor(fit.widthFt / STEP + 1e-6);
  const blocked: number[][] = Array.from({ length: rows }, () => new Array(cols).fill(0));
  const block = (x: number, y: number, w: number, h: number) => {
    const c0 = Math.max(0, Math.floor(x / STEP + 1e-6));
    const c1 = Math.min(cols, Math.ceil((x + w) / STEP - 1e-6));
    const r0 = Math.max(0, Math.floor(y / STEP + 1e-6));
    const r1 = Math.min(rows, Math.ceil((y + h) / STEP - 1e-6));
    for (let r = r0; r < r1; r++) for (let c = c0; c < c1; c++) blocked[r][c] = 1;
  };
  for (const f of fit.furniture) {
    if (MOVABLE.has(f.type)) continue;
    const fp = footprint(f);
    block(fp.x, fp.y, fp.w, fp.h);
  }
  // Door swing: the bottom of the left wall, as ScalePlan draws it.
  const door = Math.min(3, fit.widthFt * 0.4);
  block(0, fit.widthFt - door, door, door);
  // Prefix sums for O(1) "is this window free" checks.
  const sum: number[][] = Array.from({ length: rows + 1 }, () => new Array(cols + 1).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) sum[r + 1][c + 1] = blocked[r][c] + sum[r][c + 1] + sum[r + 1][c] - sum[r][c];
  return { cols, rows, sum };
}

/** Where a rug of w × l feet (w along x) fits, closest to the room's centre, or null. */
function place(grid: ReturnType<typeof floorGrid>, fit: FittedRoom, w: number, l: number): { x: number; y: number } | null {
  const cw = Math.round(w / STEP);
  const cl = Math.round(l / STEP);
  const { cols, rows, sum } = grid;
  let best: { x: number; y: number; d: number } | null = null;
  for (let r = 0; r + cl <= rows; r++) {
    for (let c = 0; c + cw <= cols; c++) {
      const used = sum[r + cl][c + cw] - sum[r][c + cw] - sum[r + cl][c] + sum[r][c];
      if (used) continue;
      const x = c * STEP;
      const y = r * STEP;
      const d = Math.hypot(x + w / 2 - fit.lengthFt / 2, y + l / 2 - fit.widthFt / 2);
      if (!best || d < best.d) best = { x, y, d };
    }
  }
  return best && { x: best.x, y: best.y };
}

/** Every standard rug size that fits the open floor in the planner's starting layout (either way round). */
export function fittingRugs(fit: FittedRoom): PlacedRug[] {
  const grid = floorGrid(fit);
  const out: PlacedRug[] = [];
  for (const size of RUG_SIZES) {
    const [a, b] = size;
    // Try the long side along the room's length first, then turned.
    for (const [w, l] of [
      [b, a],
      [a, b],
    ]) {
      const at = place(grid, fit, w, l);
      if (at) {
        out.push({ size, x: at.x, y: at.y, w, l });
        break;
      }
    }
  }
  return out;
}

/** The biggest standard rug that fits, placed as close to the room's centre as it goes. */
export function bestRug(fit: FittedRoom): PlacedRug | null {
  return fittingRugs(fit).at(-1) ?? null;
}
