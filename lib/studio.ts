import type { FurnitureItem, ProductCategory, RoomOutline, SelectedRoom } from "./types";
import { footprint, rectInsidePolygon } from "@/components/canvas/geometry";

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
  if (/bed|bunk/.test(t)) return /bunk/.test(t) ? "bunk" : "bed";
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
  return ({bed:2,bunk:5.7,desk:2.5,chair:3,wardrobe:6,dresser:3.1,shelf:4.5,rug:.035,
    lamp:1.5,mirror:4.8,art:2.5,plant:2,fridge:2.6,pillow:.4,lights:.15,storage:1.3} as Record<string,number>)[modelKind(f)] ?? 1.5;
}
export function itemElevation(f: FurnitureItem, items: FurnitureItem[]): number {
  if (typeof f.elevation_ft === "number") return f.elevation_ft;
  const k = modelKind(f);
  if (k === "art" || k === "lights") return k === "lights" ? 6.5 : 3.4;
  if (!["lamp","plant","pillow"].includes(k)) return 0;
  const fp = footprint(f), cx=fp.x+fp.w/2, cy=fp.y+fp.h/2;
  const host = items.find(p => p.id!==f.id && ["desk","dresser","bed","shelf"].includes(modelKind(p)) &&
    (()=>{const b=footprint(p);return b.w*b.h>fp.w*fp.h && cx>=b.x&&cx<=b.x+b.w&&cy>=b.y&&cy<=b.y+b.h;})());
  return host ? itemHeight(host) : 0;
}
export function visibleFurniture(items: FurnitureItem[], hidden: string[], excluded: ProductCategory[]): FurnitureItem[] {
  return items.filter(f=>!hidden.includes(f.id) && (f.built_in || !f.product_category || !excluded.includes(f.product_category as ProductCategory)));
}
export function constrainedPosition(f: FurnitureItem, x: number, y: number, room: SelectedRoom, snap: boolean): {x:number;y:number} {
  const b=footprint(f), round=(n:number)=>snap?Math.round(n*2)/2:Math.round(n*100)/100;
  x=Math.max(0,Math.min(room.lengthFt-b.w,round(x)));
  y=Math.max(0,Math.min(room.widthFt-b.h,round(y)));
  if(!room.outline || rectInsidePolygon({...b,x,y},room.outline.points))return {x,y};
  return {x:f.x_ft,y:f.y_ft};
}
const overlaps=(a:ReturnType<typeof footprint>,b:ReturnType<typeof footprint>)=>a.x<b.x+b.w-.02&&b.x<a.x+a.w-.02&&a.y<b.y+b.h-.02&&b.y<a.y+a.h-.02;
export function placementIssues(items: FurnitureItem[], room: SelectedRoom, settings: StudioSettings): {id:string;message:string}[] {
  const result:{id:string;message:string}[]=[];
  const add=(id:string,message:string)=>{if(!result.some(x=>x.id===id&&x.message===message))result.push({id,message});};
  const outline=roomOutline(room);
  for(const f of items){
    const b=footprint(f), k=modelKind(f), e=itemElevation(f,items);
    if(!rectInsidePolygon(b,outline.points))add(f.id,"Crosses a room wall");
    if(e+itemHeight(f)>settings.ceilingFt+.1)add(f.id,"Above the ceiling");
    if(["rug","art","lights","mirror"].includes(k))continue;
    for(const c of outline.closets)if(overlaps(b,{x:c.x_ft,y:c.y_ft,w:c.width_ft,h:c.depth_ft}))add(f.id,"Overlaps a fixed closet");
    for(const o of outline.openings.filter(o=>o.kind==="door" && (o.swing??0)<2)){
      const a=outline.points[o.edge],z=outline.points[(o.edge+1)%outline.points.length],len=Math.hypot(z.x-a.x,z.y-a.y)||1;
      const offset=o.offset_ft+((o.swing??0)%2 ? o.width_ft:0),cx=a.x+(z.x-a.x)*offset/len,cy=a.y+(z.y-a.y)*offset/len;
      const nearX=Math.max(b.x,Math.min(cx,b.x+b.w)),nearY=Math.max(b.y,Math.min(cy,b.y+b.h));
      if(e<6.6 && Math.hypot(nearX-cx,nearY-cy)<o.width_ft-.1)add(f.id,"Near the door swing. Check clearance");
    }
    for(const other of items){
      if(other.id<=f.id || ["rug","art","lights","mirror"].includes(modelKind(other)))continue;
      const oe=itemElevation(other,items);
      const underBed=(modelKind(f)==="storage" && modelKind(other)==="bed" && e+itemHeight(f)<itemHeight(other)*.7)||
        (modelKind(other)==="storage" && k==="bed" && oe+itemHeight(other)<itemHeight(f)*.7);
      if(!underBed && overlaps(b,footprint(other)) && e<oe+itemHeight(other)-.06 && oe<e+itemHeight(f)-.06){
        add(f.id,"Overlaps "+other.label);add(other.id,"Overlaps "+f.label);
      }
    }
  }
  return result;
}
