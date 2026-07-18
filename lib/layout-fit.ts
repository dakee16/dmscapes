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

  return furniture.map((f) => {
    const { w, h } = footprint(f);
    return {
      ...f,
      x_ft: fitAxis(f.x_ft, w, nominal.length, roomLengthFt),
      y_ft: fitAxis(f.y_ft, h, nominal.width, roomWidthFt),
    };
  });
}
