import { sanitizeEditor, sanitizeFurnitureList, sanitizeStudio } from "./studio-save";
import { roomEditError } from "./room-editing";
import { ALL_STYLE_IDS } from "./styles";
import type { SaveRoomRequest } from "./api-types";
import type { RoomOutline, StyleId } from "./types";

const num = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
const string = (v: unknown, max: number): v is string => typeof v === "string" && !!v.trim() && v.length <= max;
const id = (v: unknown) => v == null ? null : string(v, 100) ? v : undefined;
export function cleanWorkspaceSnapshot(value: unknown): SaveRoomRequest | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const s = value as SaveRoomRequest, d = s.room_dimensions;
  if (!d || !num(d.length_ft, 4, 60) || !num(d.width_ft, 4, 60) || !Number.isInteger(d.occupants) || !num(d.occupants, 1, 8) ||
    !string(d.room_type, 60) || !ALL_STYLE_IDS.includes(s.style) || !num(s.budget, 200, 1500) || !string(s.template_id, 100) ||
    id(s.college_id) === undefined || id(s.dorm_id) === undefined || (s.name != null && !string(s.name, 80))) return null;
  if (d.bed_size && !["twin", "twin_xl", "full", "full_xl", "queen"].includes(d.bed_size)) return null;
  const furniture = sanitizeFurnitureList(s.furniture_positions), editor = d.editor == null ? undefined : sanitizeEditor(d.editor), studio = d.studio == null ? undefined : sanitizeStudio(d.studio);
  if (!furniture || (d.editor != null && !editor) || (d.studio != null && !studio)) return null;
  let outline: RoomOutline | undefined;
  if (d.outline != null) {
    const o = d.outline;
    if (!Array.isArray(o.points) || o.points.length < 3 || o.points.length > 40 || !Array.isArray(o.openings) || o.openings.length > 20 || !Array.isArray(o.closets) || o.closets.length > 20) return null;
    if (o.points.some(p => !p || !num(p.x, 0, d.length_ft) || !num(p.y, 0, d.width_ft))) return null;
    if (o.openings.some(w => !w || !["door", "window"].includes(w.kind) || !Number.isInteger(w.edge) || !num(w.edge, 0, o.points.length - 1) || !num(w.offset_ft, 0, 120) || !num(w.width_ft, .1, 20) || (w.swing !== undefined && (!Number.isInteger(w.swing) || !num(w.swing, 0, 3))))) return null;
    if (o.closets.some(c => !c || !num(c.x_ft, 0, 60) || !num(c.y_ft, 0, 60) || !num(c.width_ft, .1, 40) || !num(c.depth_ft, .1, 40))) return null;
    outline = { points: o.points.map(({ x, y }) => ({ x, y })), openings: o.openings.map(({ kind, edge, offset_ft, width_ft, swing }) => ({ kind, edge, offset_ft, width_ft, ...(swing !== undefined ? { swing } : {}) })), closets: o.closets.map(({ x_ft, y_ft, width_ft, depth_ft }) => ({ x_ft, y_ft, width_ft, depth_ft })) };
    if (roomEditError(outline)) return null;
  }
  if (!s.selected_products || typeof s.selected_products !== "object" || Array.isArray(s.selected_products)) return null;
  const entries = Object.entries(s.selected_products);
  if (entries.length > 60 || entries.some(([k, v]) => !string(k, 40) || !string(v, 100))) return null;
  return { name: s.name?.trim() ?? "My room", college_id: id(s.college_id)!, dorm_id: id(s.dorm_id)!,
    room_dimensions: { length_ft: d.length_ft, width_ft: d.width_ft, room_type: d.room_type, occupants: d.occupants,
      ...(d.bed_size ? { bed_size: d.bed_size } : {}), estimated: d.estimated === true,
      ...(outline ? { outline } : {}), ...(studio ? { studio } : {}), ...(editor ? { editor } : {}) },
    style: s.style as StyleId, budget: s.budget, template_id: s.template_id, furniture_positions: furniture, selected_products: Object.fromEntries(entries) };
}
