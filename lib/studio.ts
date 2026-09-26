import type { FurnitureItem, ProductCategory, RoomOutline, SelectedRoom } from "./types";
import { furnitureCategory } from "./highlight";
import { isBunkBed } from "./bedding";
import { bedMetrics, bedMode } from "./bed-config";
import { footprint, furnitureContainsPoint, furnitureCorners, furnitureInsidePolygon, furnitureLocalPoint, polygonsOverlap, rectCorners } from "@/components/canvas/geometry";

export interface StudioSettings {
  ceilingFt: number;
  floor: "oak" | "walnut" | "concrete" | "carpet";
  wallColor: string;
  lighting: "day" | "evening";
}
export const DEFAULT_STUDIO: StudioSettings = { ceilingFt: 8, floor: "oak", wallColor: "#f3eee4", lighting: "day" };
export const FLOOR_FINISHES = { oak: "#c9a77b", walnut: "#805c43", concrete: "#a8aaa6", carpet: "#c4bcae" };
export function studioSettings(value?: Partial<StudioSettings> | null): StudioSettings {
  return { ceilingFt: Number.isFinite(value?.ceilingFt) ? Math.max(6, Math.min(16, value!.ceilingFt!)) : 8,
    floor: value?.floor && Object.hasOwn(FLOOR_FINISHES,value.floor) ? value.floor : "oak",
    wallColor: /^#[0-9a-f]{6}$/i.test(value?.wallColor ?? "") ? value!.wallColor! : DEFAULT_STUDIO.wallColor,
    lighting: value?.lighting === "evening" ? "evening" : "day" };
}
export function roomOutline(room: SelectedRoom): RoomOutline {
  if (room.outline) return room.outline;
  return { points: [{x:0,y:0},{x:room.lengthFt,y:0},{x:room.lengthFt,y:room.widthFt},{x:0,y:room.widthFt}],
    openings: [], closets: [] };
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
