import { fitRoom, ft, sqFtOf, type FittedRoom } from "@/lib/room-preview";
import { formatRoomType } from "@/lib/format";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { HOME_VIBES } from "@/lib/home-data";
import { CUSTOM_STYLE, STYLES } from "@/lib/styles";
import type { RoomSummary, SchoolSummary, SelectedRoom, StyleId } from "@/lib/types";

/** The planner's selected room in the catalog's shape, so it can be drawn with fitRoom. */
export function summaryOf(room: SelectedRoom): RoomSummary {
  return {
    type: room.type,
    label: formatRoomType(room.type),
    occupants: room.occupants,
    length_ft: room.lengthFt,
    width_ft: room.widthFt,
    sqft: null,
    bed_size: room.bedSize,
    closet: null,
  };
}

/** The selected room drawn the way the planner will start it (built-ins only). */
export function fitSelected(room: SelectedRoom | null): FittedRoom | null {
  return room ? fitRoom(summaryOf(room)) : null;
}

/** "16.4 × 12 ft" with the long side first, as the plans draw it. */
export function dimsOf(lengthFt: number, widthFt: number): string {
  return `${ft(Math.max(lengthFt, widthFt))} × ${ft(Math.min(lengthFt, widthFt))} ft`;
}

export function sqftOfSelected(room: SelectedRoom): number {
  return Math.round(room.lengthFt * room.widthFt);
}

export { sqFtOf };

/** Counts for a school row, straight from the school data. */
export function schoolCounts(s: SchoolSummary): { buildings: number; roomTypes: number } {
  return {
    buildings: s.dorms.length,
    roomTypes: s.dorms.reduce((n, d) => n + d.rooms.length, 0),
  };
}

export const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString("en-US")} ${n === 1 ? one : many}`;

/** Short school name for tight spots (cards, the generating header). */
export function schoolLabel(college: { id: string | null; name: string } | null): string | null {
  if (!college) return null;
  const s = college.id ? getSchool(college.id) : undefined;
  return s ? shortName(s) : college.name;
}

export interface VibeMeta {
  id: StyleId;
  name: string;
  line: string;
  plus: boolean;
  dots: [string, string, string];
}

/** Live vibe copy and swatch colors (shared with the homepage vibe cards). */
export function vibeMeta(id: StyleId | null, customVibe?: string | null): VibeMeta | null {
  if (!id) return null;
  if (id === "custom") {
    return {
      id,
      name: customVibe?.trim() || CUSTOM_STYLE.name,
      line: "",
      plus: false,
      dots: [CUSTOM_STYLE.palette[2], CUSTOM_STYLE.palette[1], CUSTOM_STYLE.palette[3]],
    };
  }
  const v = HOME_VIBES.find((x) => x.id === id);
  if (v) return { id, name: v.name, line: v.line, plus: v.plus, dots: v.dots };
  const s = STYLES.find((x) => x.id === id);
  return s ? { id, name: s.name, line: s.keywords.join(", "), plus: Boolean(s.plus), dots: [s.palette[3], s.palette[1], s.palette[0]] } : null;
}

export const usd = (n: number) => `$${n.toLocaleString("en-US")}`;
