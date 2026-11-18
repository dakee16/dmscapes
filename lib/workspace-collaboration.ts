export type RoomSection = "room" | "shopping" | "halls" | "roommates";
export type RoomActivity = { section: RoomSection; view: "2d" | "3d"; selected: string | null };
/** `hidden`: the tab is in the background, so nobody's looking at others' cursors there. */
export type RoomPresence = RoomActivity & { session: string; active: boolean; at: number; hidden?: boolean };
/** A point in the room: x and y run 0–1 across its length and width; in 3D, `h` is the height in feet and `id` the piece pointed at. */
export type CursorPoint = { x: number; y: number; h?: number; id?: string };
/** `at` is the sender's clock when sent; `seq` counts that session's cursor messages. */
export type RoomCursor = CursorPoint & { surface: string; session: string; at: number; seq?: number };
export const COLLABORATOR_COLORS = ["#304bff", "#a54813", "#168061", "#853fc4"];
export function collaboratorColor(id: string, members?: string[]) {
  const index=members?[...members].sort().indexOf(id):-1;
  if(index>=0)return COLLABORATOR_COLORS[index % COLLABORATOR_COLORS.length];
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return COLLABORATOR_COLORS[hash % COLLABORATOR_COLORS.length];
}
const surfaces = /^(plan|scene|shopping|roommates)$/;
export function readCursor(value: unknown): RoomCursor | null {
  if (!value || typeof value !== "object") return null;
  const c = value as RoomCursor, point = readPoint(c);
  return point && typeof c.surface === "string" && surfaces.test(c.surface) &&
    typeof c.session === "string" && c.session.length <= 64 && Number.isFinite(c.at) ?
    {...point, surface:c.surface, session:c.session, at:c.at, ...(Number.isSafeInteger(c.seq) ? {seq:c.seq} : {})} : null;
}
/** A "Look here": a room point (with height and piece in 3D), the sending tab, and when. Live only, never saved. */
export type RoomPing = CursorPoint & { session: string; at: number; seq: number };
export function readPing(value: unknown): RoomPing | null {
  if (!value || typeof value !== "object") return null;
  const p = value as RoomPing, point = readPoint(p);
  return point && typeof p.session === "string" && p.session.length <= 64 && Number.isFinite(p.at) && Number.isSafeInteger(p.seq) ?
    {...point, session:p.session, at:p.at, seq:p.seq} : null;
}
/** A room point from a message: x, y in 0–1, an optional height of 0–20 ft and an optional piece id. */
export function readPoint(value: unknown): CursorPoint | null {
  if (!value || typeof value !== "object") return null;
  const c = value as CursorPoint;
  if (!Number.isFinite(c.x) || !Number.isFinite(c.y) || c.x < 0 || c.y < 0 || c.x > 1 || c.y > 1) return null;
  if (c.h !== undefined && !(Number.isFinite(c.h) && c.h >= 0 && c.h <= 20)) return null;
  if (c.id !== undefined && !(typeof c.id === "string" && /^[a-zA-Z0-9_.:-]{1,100}$/.test(c.id))) return null;
  return {x:c.x, y:c.y, ...(c.h !== undefined ? {h:c.h} : {}), ...(c.id !== undefined ? {id:c.id} : {})};
}
export function readPresence(value: unknown): RoomPresence | null {
  if (!value || typeof value !== "object") return null;
  const p = value as RoomPresence;
  if (!["room","shopping","halls","roommates"].includes(p.section) || !["2d","3d"].includes(p.view) || typeof p.active !== "boolean" ||
    typeof p.session !== "string" || p.session.length > 64 || !Number.isFinite(p.at)) return null;
  return {section:p.section, view:p.view, active:p.active, session:p.session, at:p.at,
    selected: typeof p.selected === "string" && p.selected.length <= 100 ? p.selected : null, hidden: p.hidden === true};
}
export function presenceLabel(p: RoomPresence | undefined, connected: boolean) {
  if (!connected) return "Presence unavailable";
  if (!p) return "Offline";
  if (!p.active) return "Away";
  if (p.section === "shopping") return "Browsing shopping";
  if (p.section === "halls") return "Comparing halls";
  if (p.section === "roommates") return "With the roommates";
  return p.view === "3d" ? "In the 3D room" : "In the 2D plan";
}

/** A comment on a spot in the room: `point:<x>:<y>[:<h>]`, x and y 0–1 to 4 decimals, h the height in feet (3D only). */
export function pointTarget(p: { x: number; y: number; h?: number }) {
  const n = (v: number, places: number) => String(Math.round(Math.min(1, Math.max(0, v)) * 10 ** places) / 10 ** places);
  return `point:${n(p.x, 4)}:${n(p.y, 4)}${p.h && p.h >= .005 ? `:${Math.round(Math.min(20, p.h) * 100) / 100}` : ""}`;
}
const pointPattern = /^point:(0(?:\.\d{1,4})?|1(?:\.0{1,4})?):(0(?:\.\d{1,4})?|1(?:\.0{1,4})?)(?::(\d{1,2}(?:\.\d{1,2})?))?$/;
export function readPointTarget(target: string): { x: number; y: number; h?: number } | null {
  const m = pointPattern.exec(target), h = m?.[3] === undefined ? undefined : Number(m[3]);
  return m && (h === undefined || h <= 20) ? { x: Number(m[1]), y: Number(m[2]), ...(h !== undefined ? { h } : {}) } : null;
}
/**
 * What a spot comment is called: "Spot near Desk" when a piece is within 3 ft, else by the window, on the wall or on
 * the floor. `pieces` are footprints and `windows` window centres, in feet; `inside` says whether a point (ft) is in
 * the room as it's drawn now.
 */
export function spotLabel(p: { x: number; y: number; h?: number }, room: { lengthFt: number; widthFt: number; inside: (x: number, y: number) => boolean },
  pieces: { label: string; x: number; y: number; w: number; h: number }[], windows: { x: number; y: number }[]) {
  const x = p.x * room.lengthFt, y = p.y * room.widthFt;
  if (!room.inside(x, y)) return "Spot (outside the room now)";
  const near = pieces.map(r => ({ label: r.label, d: Math.hypot(Math.max(r.x - x, 0, x - r.x - r.w), Math.max(r.y - y, 0, y - r.y - r.h)) }))
    .filter(r => r.d <= 3).sort((a, b) => a.d - b.d)[0];
  if (near) return `Spot near ${near.label}`;
  if (windows.some(w => Math.hypot(w.x - x, w.y - y) <= 3)) return "Spot by the window";
  return (p.h ?? 0) > .5 ? "Spot on the wall" : "Spot on the floor";
}
