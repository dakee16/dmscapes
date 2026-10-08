import type { FurnitureItem, Point, ProductCategory, RoomOutline, SelectedRoom, WallOpening } from "./types";
import { furnitureCategory } from "./highlight";
import { isBunkBed } from "./bedding";
import { bedMetrics, bedMode } from "./bed-config";
import { footprint, furnitureContainsPoint, furnitureCorners, furnitureInsidePolygon, furnitureLocalPoint, pointInPolygon, polygonsOverlap, rectCorners } from "@/components/canvas/geometry";

export interface StudioSettings {
  ceilingFt: number;
  floor: "oak" | "walnut" | "concrete" | "carpet";
  wallColor: string;
  /** "evening" is golden hour (the stored value predates the name). */
  lighting: "day" | "evening" | "night";
  /** Bedding, rug, throw and decor take the vibe's colors. Missing means on. */
  dressVibe?: boolean;
}
export const LIGHTING_PRESETS = ["day", "evening", "night"] as const;
export const DEFAULT_STUDIO: StudioSettings = { ceilingFt: 8, floor: "oak", wallColor: "#f3eee4", lighting: "day", dressVibe: true };
export const FLOOR_FINISHES = { oak: "#c9a77b", walnut: "#805c43", concrete: "#c9c3bd", carpet: "#c4bcae" };
/** What the studio calls each stored value. */
export const LIGHT_LABELS: Record<StudioSettings["lighting"], string> = { day: "Day", evening: "Golden hour", night: "Night" };
export const FLOOR_LABELS: Record<StudioSettings["floor"], string> = { oak: "Oak", walnut: "Walnut", concrete: "Tile", carpet: "Carpet" };
export function studioSettings(value?: Partial<StudioSettings> | null): StudioSettings {
  return { ceilingFt: Number.isFinite(value?.ceilingFt) ? Math.max(6, Math.min(16, value!.ceilingFt!)) : 8,
    floor: value?.floor && Object.hasOwn(FLOOR_FINISHES,value.floor) ? value.floor : "oak",
    wallColor: /^#[0-9a-f]{6}$/i.test(value?.wallColor ?? "") ? value!.wallColor! : DEFAULT_STUDIO.wallColor,
    lighting: LIGHTING_PRESETS.includes(value?.lighting as StudioSettings["lighting"]) ? value!.lighting! : "day",
    dressVibe: value?.dressVibe !== false };
}
/**
 * Where a room's door and window go when none have been placed: a 3 ft door near the bottom of the
 * left wall, hinged at the corner end and swinging in, and a window centred on the right wall.
 * That is where every layout template expects them, so furniture already keeps clear. They are
 * ordinary openings: drag them to match the real room.
 */
export function defaultOpenings(points: Point[]): WallOpening[] {
  const edges = points.map((a, edge) => { const b = points[(edge + 1) % points.length];
    return { edge, a, b, len: Math.hypot(b.x - a.x, b.y - a.y), mx: (a.x + b.x) / 2, upright: Math.abs(b.x - a.x) < 1e-6 }; }).filter(e => e.len >= 1);
  const upright = edges.filter(e => e.upright), pool = upright.length >= 2 ? upright : edges;
  const left = pool.filter(e => e.len >= 3.5).sort((p, q) => p.mx - q.mx || Math.max(q.a.y, q.b.y) - Math.max(p.a.y, p.b.y))[0];
  const right = pool.filter(e => e !== left && e.len >= 2).sort((p, q) => q.mx - p.mx)[0];
  const out: WallOpening[] = [];
  if (left) {
    // .25 ft up from the bottom corner, hinged at the corner end, so its swing stays in the clear corner the templates leave.
    const up = left.a.y > left.b.y;
    out.push({ kind: "door", edge: left.edge, offset_ft: up ? .25 : left.len - 3.25, width_ft: 3, swing: up ? 0 : 1 });
  }
  if (right) { const width = Math.min(4, right.len - 1); out.push({ kind: "window", edge: right.edge, offset_ft: (right.len - width) / 2, width_ft: width }); }
  return out;
}
const withDefaults = new WeakMap<object, RoomOutline>();
/** The room's walls, doors, windows and closets. Every room has a door and a window: when none are stored, the defaults above. */
export function roomOutline(room: SelectedRoom): RoomOutline {
  const base = room.outline ?? { points: [{x:0,y:0},{x:room.lengthFt,y:0},{x:room.lengthFt,y:room.widthFt},{x:0,y:room.widthFt}], openings: [], closets: [] };
  if (base.openings.length) return base;
  // Cached per stored outline (or per room when there is none), so the same room keeps the same object.
  const key = room.outline ?? room;
  let outline = withDefaults.get(key);
  if (!outline) { outline = { ...base, openings: defaultOpenings(base.points) }; withDefaults.set(key, outline); }
  return outline;
}
export function modelKind(item: FurnitureItem): string {
  const t = item.type.toLowerCase();
  if (bedMode(item)) return bedMode(item)==="bunked"?"bunk":"bed";
  if (["sofa","lounge","ottoman","radiator","column","microwave"].includes(t)) return t;
  if (["art","lights","lamp","chair","storage","pillow","fridge"].includes(t)) return t;
  if (isBunkBed(item)) return "bunk";
  if (t === "bed") return "bed";
  if (/desk$|table/.test(t)) return "desk";
  if (/chair/.test(t)) return "chair";
  if (/wardrobe|closet/.test(t)) return "wardrobe";
  if (/dresser/.test(t)) return "dresser";
  if (/shelf|bookcase|shelving/.test(t)) return "shelf";
  if (/rug/.test(t)) return "rug";
  if (/lamp|lighting/.test(t)) return "lamp";
  if (/mirror/.test(t)) return "mirror";
  if (/wall|tapestry|poster/.test(t)) return "art";
  if (/plant/.test(t)) return "plant";
  if (/fridge/.test(t)) return "fridge";
  if (/pillow|throw/.test(t)) return "pillow";
  if (/string/.test(t)) return "lights";
  return "storage";
}
export function itemHeight(f: FurnitureItem): number {
  if (typeof f.height_ft === "number" && f.height_ft > 0) return f.height_ft;
  if (bedMetrics(f)) return bedMetrics(f)!.height;
  return ({bed:2,bunk:5.7,desk:2.5,chair:3,wardrobe:6,dresser:3.1,shelf:4.5,rug:.035,
    lamp:1.5,mirror:4.8,art:2.5,plant:2,fridge:2.6,pillow:.4,lights:.15,storage:1.3} as Record<string,number>)[modelKind(f)] ?? 1.5;
}
export function bedSurfaceHeight(f: FurnitureItem): number {
  return bedMode(f)==="lofted" ? itemHeight(f)*.78+.195 : isBunkBed(f) ? itemHeight(f)*.3+.195 : itemHeight(f)-.085;
}
export function itemElevation(f: FurnitureItem, items: FurnitureItem[]): number {
  if (typeof f.elevation_ft === "number") return f.elevation_ft;
  const k = modelKind(f);
  if (k === "art" || k === "lights") return k === "lights" ? 6.5 : 3.4;
  if (!["lamp","plant","pillow"].includes(k)) return 0;
  const fp = footprint(f), cx=fp.x+fp.w/2, cy=fp.y+fp.h/2;
  const host = items.find(p => p.id!==f.id && ["desk","dresser","bed","bunk","shelf"].includes(modelKind(p)) &&
    p.width_ft*p.length_ft>f.width_ft*f.length_ft && furnitureContainsPoint(p,{x:cx,y:cy}));
  return host ? ["bed","bunk"].includes(modelKind(host)) ? bedSurfaceHeight(host) : itemHeight(host) : 0;
}
/** A side of a piece in its own unrotated frame: 0 top, 1 right, 2 bottom, 3 left (in 3D: -z, +x, +z, -x). */
export type BackSide = 0 | 1 | 2 | 3;
/** Pieces whose back goes against the nearest wall (fronts, drawers and doors face the room). */
const BACK_TO_WALL = new Set(["desk","sofa","lounge","dresser","wardrobe","fridge","microwave","shelf","storage","trash","lamp"]);
/** Flat pieces that hang on a wall: their back is always one of their long sides. */
const HANGS = new Set(["art","mirror","lights","curtains","macrame","wall-shelf"]);
/**
 * Which side of each piece is its back, so the 2D Room view and the 3D room
 * agree and nothing faces a wall: a bed's head is the end with its throw
 * pillows, or away from a throw blanket folded at its foot (else the end
 * nearest a wall), a chair turns its back on its desk, dressers, desks,
 * shelves and appliances back onto the nearest wall, and wall pieces hang flat
 * against it. Symmetric pieces aren't listed (back 0). `blanket` says which
 * throws are blankets rather than pillows (the product decides).
 */
export function backSides(items: FurnitureItem[], roomL: number, roomW: number, outline?: RoomOutline | null, blanket: (f: FurnitureItem) => boolean = f => f.type === "throw"): Map<string, BackSide> {
  const out = new Map<string, BackSide>();
  const pts = outline?.points ?? [{x:0,y:0},{x:roomL,y:0},{x:roomL,y:roomW},{x:0,y:roomW}];
  const centre = (f: FurnitureItem) => { const b = footprint(f); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; };
  const desks = items.filter(f => modelKind(f) === "desk").map(centre);
  const throws = items.filter(f => f.type === "throw_pillows" || f.type === "throw").map(f => ({ ...centre(f), foot: blanket(f) }));
  // The walls: each edge with its inward normal.
  const edges = pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length], len = Math.hypot(b.x - a.x, b.y - a.y) || 1, dx = (b.x - a.x) / len, dy = (b.y - a.y) / len;
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, inward = pointInPolygon(mx - dy * .05, my + dx * .05, pts) ? { x: -dy, y: dx } : { x: dy, y: -dx };
    return { a, len, dx, dy, n: inward };
  });
  /** The direction from a piece to the wall nearest its footprint (a wall it actually faces along its span). */
  const nearestWall = (f: FurnitureItem): [number, number] => {
    const b = footprint(f), c = { x: b.x + b.w / 2, y: b.y + b.h / 2 };
    let best: [number, number] | null = null, gap = Infinity;
    for (const e of edges) {
      const along = (c.x - e.a.x) * e.dx + (c.y - e.a.y) * e.dy, reach = Math.abs(e.dx) * b.w / 2 + Math.abs(e.dy) * b.h / 2;
      if (along < -reach || along > e.len + reach) continue;
      const g = (c.x - e.a.x) * e.n.x + (c.y - e.a.y) * e.n.y - (Math.abs(e.n.x) * b.w / 2 + Math.abs(e.n.y) * b.h / 2);
      if (g > -.5 && g < gap) { gap = g; best = [-e.n.x, -e.n.y]; }
    }
    if (best) return best;
    const gaps = [b.y, roomL - b.x - b.w, roomW - b.y - b.h, b.x];
    return ([[0, -1], [1, 0], [0, 1], [-1, 0]] as [number, number][])[gaps.indexOf(Math.min(...gaps))];
  };
  for (const f of items) {
    const k = modelKind(f), b = footprint(f), c = centre(f);
    const bed = k === "bed" || k === "bunk", chair = k === "chair", hangs = HANGS.has(k);
    if (!bed && !chair && !hangs && !BACK_TO_WALL.has(k)) continue;
    let dir: [number, number];
    const on = bed ? throws.filter(p => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h) : [];
    const pillow = on.find(p => !p.foot) ?? on[0];
    const desk = chair ? desks.slice().sort((p, q) => Math.hypot(p.x - c.x, p.y - c.y) - Math.hypot(q.x - c.x, q.y - c.y))[0] : undefined;
    if (pillow) dir = pillow.foot ? [c.x - pillow.x, c.y - pillow.y] : [pillow.x - c.x, pillow.y - c.y];
    else if (bed) dir = b.w >= b.h ? [b.x <= roomL - b.x - b.w ? -1 : 1, 0] : [0, b.y <= roomW - b.y - b.h ? -1 : 1];
    else if (desk && Math.hypot(desk.x - c.x, desk.y - c.y) < 5) dir = [c.x - desk.x, c.y - desk.y];
    else dir = nearestWall(f);
    const local = (Math.atan2(dir[1], dir[0]) * 180 / Math.PI - f.rotation_deg) * Math.PI / 180;
    // A bed's head is one of its short ends; a hanging piece hangs by a long side.
    if (bed || (hangs && f.length_ft <= f.width_ft)) out.set(f.id, Math.sin(local) < 0 ? 0 : 2);
    else if (hangs) out.set(f.id, Math.cos(local) > 0 ? 1 : 3);
    else out.set(f.id, ((((Math.round(local * 2 / Math.PI) + 1) % 4) + 4) % 4) as BackSide);
  }
  return out;
}
export function visibleFurniture(items: FurnitureItem[], hidden: string[], excluded: ProductCategory[]): FurnitureItem[] {
  return items.filter(f=>!hidden.includes(f.id) && (f.inventory || f.built_in || f.type === "custom" || !furnitureCategory(f) || !excluded.includes(furnitureCategory(f)!)));
}
export function constrainedPosition(f: FurnitureItem, x: number, y: number, room: SelectedRoom, snap: boolean): {x:number;y:number} {
  const b=footprint(f), round=(n:number)=>snap?Math.round(n*2)/2:Math.round(n*100)/100;
  x=Math.max(0,Math.min(room.lengthFt-b.w,round(x)));
  y=Math.max(0,Math.min(room.widthFt-b.h,round(y)));
  if(!room.outline || furnitureInsidePolygon({...f,x_ft:x,y_ft:y},room.outline.points))return {x,y};
  return {x:f.x_ft,y:f.y_ft};
}
export function placementIssues(items: FurnitureItem[], room: SelectedRoom, settings: StudioSettings): {id:string;message:string}[] {
  const result:{id:string;message:string}[]=[];
  const add=(id:string,message:string)=>{if(!result.some(x=>x.id===id&&x.message===message))result.push({id,message});};
  const outline=roomOutline(room);
  for(const f of items){
    const corners=furnitureCorners(f), k=modelKind(f), e=itemElevation(f,items);
    if(!furnitureInsidePolygon(f,outline.points))add(f.id,"Crosses a room wall");
    if(e+itemHeight(f)>settings.ceilingFt+.1)add(f.id,"Above the ceiling");
    if(["rug","art","lights","mirror"].includes(k))continue;
    for(const c of outline.closets)if(polygonsOverlap(corners,rectCorners({x:c.x_ft,y:c.y_ft,w:c.width_ft,h:c.depth_ft}),.02))add(f.id,"Overlaps a fixed closet");
    for(const o of outline.openings.filter(o=>o.kind==="door" && (o.swing??0)<2)){
      const a=outline.points[o.edge],z=outline.points[(o.edge+1)%outline.points.length],len=Math.hypot(z.x-a.x,z.y-a.y)||1;
      const offset=o.offset_ft+((o.swing??0)%2 ? o.width_ft:0),cx=a.x+(z.x-a.x)*offset/len,cy=a.y+(z.y-a.y)*offset/len;
      const local=furnitureLocalPoint(f,{x:cx,y:cy});
      const dx=Math.max(0,Math.abs(local.x)-f.width_ft/2),dy=Math.max(0,Math.abs(local.y)-f.length_ft/2);
      if(e<6.6 && Math.hypot(dx,dy)<o.width_ft-.1)add(f.id,"Near the door swing. Check clearance");
    }
    for(const other of items){
      if(other.id<=f.id || ["rug","art","lights","mirror"].includes(modelKind(other)))continue;
      const oe=itemElevation(other,items);
      const underBed=(modelKind(f)==="storage" && ["bed","bunk"].includes(modelKind(other)) && e+itemHeight(f)<(isBunkBed(other)?itemHeight(other)*.35:itemHeight(other)*.7))||
        (modelKind(other)==="storage" && ["bed","bunk"].includes(k) && oe+itemHeight(other)<(isBunkBed(f)?itemHeight(f)*.35:itemHeight(f)*.7));
      const fitsUnder=(host:FurnitureItem,guest:FurnitureItem)=>{const m=bedMetrics(host);if(!m||!["lofted","raised"].includes(m.mode))return false;
        if(itemElevation(guest,items)+itemHeight(guest)>itemElevation(host,items)+m.underside-.1)return false;
        return furnitureCorners(guest).every(p=>{const q=furnitureLocalPoint(host,p);return Math.abs(q.x)<host.width_ft/2-.18&&Math.abs(q.y)<host.length_ft/2-.18;});};
      if(!underBed && !fitsUnder(f,other) && !fitsUnder(other,f) && polygonsOverlap(corners,furnitureCorners(other),.02) && e<oe+itemHeight(other)-.06 && oe<e+itemHeight(f)-.06){
        add(f.id,"Overlaps "+other.label);add(other.id,"Overlaps "+f.label);
      }
    }
  }
  return result;
}
