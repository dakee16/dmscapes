/**
 * Template matcher for the Dormscape layout system.
 *
 * Given a room's dimensions, occupancy, and type, finds the layout template
 * that best fits it:
 *   1. Filter templates by occupant count (exact match).
 *   2. Softly filter by room type (e.g. "double", "corner double", "suite");
 *      if nothing survives, fall back to the occupant-filtered set.
 *   3. If the room's dimensions fall inside a template's min/max ranges,
 *      that's an exact match (confidence 1.0). Ties are broken by the
 *      closest aspect ratio.
 *   4. Otherwise return the nearest template by Euclidean distance from the
 *      room's dimensions to the template's range box, with confidence
 *      scaled down from 0.99 toward 0.5 as the distance grows.
 *
 * Length/width are order-insensitive: inputs are normalized so length is
 * always the longer dimension, matching how the templates are authored.
 */

import standardDouble from "./standard-double-15x12-v1.json";
import compactSquareDouble from "./compact-square-double-12x11-v1.json";
import longDouble from "./long-double-17x10-v1.json";
import smallSingle from "./small-single-11x9-v1.json";
import compactDoubleBunked from "./compact-double-bunked-12x10-v1.json";
import largeSquareDouble from "./large-square-double-16x15-v1.json";
import suiteLarge from "./suite-large-25x15-v1.json";
import wideDouble from "./wide-double-18x13-v1.json";
import corridorDouble from "./corridor-double-24x8-v1.json";
import corridorSingle from "./corridor-single-23x8-v1.json";
import compactTripleBunked from "./compact-triple-bunked-13x12-v1.json";
import standardTriple from "./standard-triple-17x16-v1.json";
import longTriple from "./long-triple-27x14-v1.json";
import compactQuadBunked from "./compact-quad-bunked-15x13-v1.json";
import standardQuad from "./standard-quad-25x17-v1.json";
import longQuad from "./long-quad-33x14-v1.json";

export interface FurnitureItem {
  id: string;
  type: string;
  label: string;
  owner: string;
  x_ft: number;
  y_ft: number;
  width_ft: number;
  length_ft: number;
  rotation_deg: number;
  movable: boolean;
  built_in: boolean;
  color_category: string;
  /** Present only on purchasable (non-built-in) items. */
  product_category?: string;
}

export interface RoomConstraints {
  min_length_ft: number;
  max_length_ft: number;
  min_width_ft: number;
  max_width_ft: number;
  occupants: number;
  room_types: string[];
}

export interface LayoutTemplate {
  template_id: string;
  name: string;
  description: string;
  room_constraints: RoomConstraints;
  furniture: FurnitureItem[];
}

export interface RoomInput {
  length_ft: number;
  width_ft: number;
  occupants: number;
  /** Free-form room type, e.g. "double", "corner double", "suite". */
  room_type: string;
}

export interface MatchResult {
  template_id: string;
  template: LayoutTemplate;
  /** 1.0 for an exact range match, 0.5–0.99 for a nearest-template match. */
  confidence: number;
  /** True when the room's dimensions fall inside the template's ranges. */
  exact_match: boolean;
}

export const ALL_TEMPLATES: LayoutTemplate[] = [
  standardDouble,
  compactSquareDouble,
  longDouble,
  smallSingle,
  compactDoubleBunked,
  largeSquareDouble,
  suiteLarge,
  wideDouble,
  corridorDouble,
  corridorSingle,
  compactTripleBunked,
  standardTriple,
  longTriple,
  compactQuadBunked,
  standardQuad,
  longQuad,
];

/** Euclidean distance (ft) from (length, width) to a template's range box. */
function distanceToTemplate(length: number, width: number, c: RoomConstraints): number {
  const dl = Math.max(0, c.min_length_ft - length, length - c.max_length_ft);
  const dw = Math.max(0, c.min_width_ft - width, width - c.max_width_ft);
  return Math.hypot(dl, dw);
}

/** Aspect ratio of the midpoint of a template's dimension ranges. */
function templateAspect(c: RoomConstraints): number {
  const midL = (c.min_length_ft + c.max_length_ft) / 2;
  const midW = (c.min_width_ft + c.max_width_ft) / 2;
  return midL / midW;
}

/**
 * Soft room-type filter: keeps templates whose declared room_types share a
 * token with the input (so "corner double" matches ["double"]). Returns the
 * original set when the filter would eliminate everything.
 */
function filterByRoomType(templates: LayoutTemplate[], roomType: string): LayoutTemplate[] {
  const input = roomType.trim().toLowerCase();
  if (!input) return templates;
  const filtered = templates.filter((t) =>
    t.room_constraints.room_types.some(
      (rt) => input.includes(rt.toLowerCase()) || rt.toLowerCase().includes(input),
    ),
  );
  return filtered.length > 0 ? filtered : templates;
}

/**
 * Match a room to the best layout template.
 *
 * Never returns null: if no template's ranges contain the room, the nearest
 * template (by distance to its dimension ranges) is returned with a reduced
 * confidence score.
 */
export function matchTemplate(room: RoomInput): MatchResult {
  // Normalize so length is the longer dimension, as templates are authored.
  const length = Math.max(room.length_ft, room.width_ft);
  const width = Math.min(room.length_ft, room.width_ft);
  const aspect = width > 0 ? length / width : Infinity;

  // 1. Occupancy filter (exact), falling back to all templates. A fallback
  //    match can never be "exact": the template was designed for a different
  //    occupant count, so confidence is capped at 0.9.
  const byOccupants = ALL_TEMPLATES.filter(
    (t) => t.room_constraints.occupants === room.occupants,
  );
  const occupancyExact = byOccupants.length > 0;
  const occupantPool = occupancyExact ? byOccupants : ALL_TEMPLATES;

  // 2. Soft room-type filter.
  const pool = filterByRoomType(occupantPool, room.room_type);

  // 3. Exact range containment → confidence 1.0, aspect-ratio tiebreak.
  //    If the room-type filter left only templates the room cannot fit
  //    (e.g. a 12x12 bedroom whose rate name says "suite" matching only the
  //    25x15 suite template), retry containment on the occupancy pool:
  //    real dimensions beat the name heuristic.
  const containsRoom = (t: LayoutTemplate): boolean => {
    const c = t.room_constraints;
    return (
      length >= c.min_length_ft &&
      length <= c.max_length_ft &&
      width >= c.min_width_ft &&
      width <= c.max_width_ft
    );
  };
  let contained = pool.filter(containsRoom);
  if (contained.length === 0 && pool.length !== occupantPool.length) {
    contained = occupantPool.filter(containsRoom);
  }
  if (contained.length > 0) {
    let best = contained[0];
    let bestDiff = Math.abs(templateAspect(best.room_constraints) - aspect);
    for (const t of contained.slice(1)) {
      const diff = Math.abs(templateAspect(t.room_constraints) - aspect);
      if (diff < bestDiff) {
        best = t;
        bestDiff = diff;
      }
    }
    return {
      template_id: best.template_id,
      template: best,
      confidence: occupancyExact ? 1.0 : 0.9,
      exact_match: occupancyExact,
    };
  }

  // 4. Nearest template by distance to the range box. The type filter has
  //    already proven unhelpful for this room's size, so search the whole
  //    occupancy pool rather than letting a name token force a distant fit.
  let best = occupantPool[0];
  let bestDist = distanceToTemplate(length, width, best.room_constraints);
  for (const t of occupantPool.slice(1)) {
    const d = distanceToTemplate(length, width, t.room_constraints);
    if (
      d < bestDist ||
      // Distance tie → prefer the closer aspect ratio.
      (d === bestDist &&
        Math.abs(templateAspect(t.room_constraints) - aspect) <
          Math.abs(templateAspect(best.room_constraints) - aspect))
    ) {
      best = t;
      bestDist = d;
    }
  }
  const ceiling = occupancyExact ? 0.99 : 0.9;
  const confidence = Math.max(0.5, Math.min(ceiling, 0.99 - 0.05 * bestDist));
  return {
    template_id: best.template_id,
    template: best,
    confidence,
    exact_match: false,
  };
}
