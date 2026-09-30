export type RoomSection = "room" | "shopping" | "roommates";
export type RoomActivity = { section: RoomSection; view: "2d" | "3d"; selected: string | null };
export type RoomPresence = RoomActivity & { session: string; active: boolean; at: number };
export type RoomCursor = { surface: string; x: number; y: number; session: string; at: number };
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
  const c = value as RoomCursor;
  return typeof c.surface === "string" && surfaces.test(c.surface) &&
    Number.isFinite(c.x) && Number.isFinite(c.y) && c.x >= 0 && c.y >= 0 && c.x <= 1 && c.y <= 1 &&
    typeof c.session === "string" && c.session.length <= 64 && Number.isFinite(c.at) ?
    {surface:c.surface, x:c.x, y:c.y, session:c.session, at:c.at} : null;
}
export function readPresence(value: unknown): RoomPresence | null {
  if (!value || typeof value !== "object") return null;
  const p = value as RoomPresence;
  if (!["room","shopping","roommates"].includes(p.section) || !["2d","3d"].includes(p.view) || typeof p.active !== "boolean" ||
    typeof p.session !== "string" || p.session.length > 64 || !Number.isFinite(p.at)) return null;
  return {section:p.section, view:p.view, active:p.active, session:p.session, at:p.at,
    selected: typeof p.selected === "string" && p.selected.length <= 100 ? p.selected : null};
}
export function presenceLabel(p: RoomPresence | undefined, connected: boolean) {
  if (!connected) return "Presence unavailable";
  if (!p) return "Offline";
  if (!p.active) return "Away";
  if (p.section === "shopping") return "Browsing shopping";
  if (p.section === "roommates") return "With the roommates";
  return p.view === "3d" ? "In the 3D room" : "In the 2D plan";
}
