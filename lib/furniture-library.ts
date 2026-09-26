import type { FurnitureItem, SelectedRoom } from "./types";
import { furnitureInsidePolygon, footprint, polygonsOverlap, furnitureCorners } from "@/components/canvas/geometry";
import { roomOutline } from "./studio";

export type FurnitureGroup = "Beds" | "Study" | "Storage" | "Seating" | "Appliances" | "Rugs" | "Fixtures";
export interface LibraryPiece { key: string; name: string; group: FurnitureGroup; type: string; w: number; d: number; h: number; clearance?: number; fixed?: boolean }
/** Original generic models. These dimensions are editable assumptions, never school-verified specifications. */
export const FURNITURE_LIBRARY: LibraryPiece[] = [
  { key:"twin-xl",name:"Twin XL bed",group:"Beds",type:"bed",w:3.25,d:6.67,h:2 },
  { key:"twin",name:"Twin bed",group:"Beds",type:"bed",w:3.25,d:6.25,h:2 },
  { key:"full",name:"Full bed",group:"Beds",type:"bed",w:4.5,d:6.25,h:2 },
  { key:"desk",name:"Study desk",group:"Study",type:"desk",w:3.5,d:2,h:2.5,clearance:2.5 },
  { key:"chair",name:"Desk chair",group:"Study",type:"chair",w:1.75,d:1.75,h:3 },
  { key:"table",name:"Side table",group:"Study",type:"table",w:1.5,d:1.5,h:1.8 },
  { key:"dresser",name:"Dresser",group:"Storage",type:"dresser",w:3,d:1.7,h:3.1,clearance:2 },
  { key:"wardrobe",name:"Wardrobe",group:"Storage",type:"wardrobe",w:3,d:2,h:6,clearance:2 },
  { key:"shelf",name:"Bookshelf",group:"Storage",type:"shelf",w:2.5,d:1,h:4.5 },
  { key:"bin",name:"Storage bin",group:"Storage",type:"storage",w:1.7,d:1.3,h:1.1 },
  { key:"sofa",name:"Loveseat",group:"Seating",type:"sofa",w:4.5,d:2.6,h:2.7 },
  { key:"lounge",name:"Lounge chair",group:"Seating",type:"lounge",w:2.5,d:2.5,h:2.7 },
  { key:"ottoman",name:"Ottoman",group:"Seating",type:"ottoman",w:2,d:2,h:1.5 },
  { key:"fridge",name:"Mini fridge",group:"Appliances",type:"fridge",w:1.6,d:1.8,h:2.6,clearance:1.5 },
  { key:"microwave",name:"Microwave",group:"Appliances",type:"microwave",w:1.5,d:1.2,h:.9,clearance:1 },
  { key:"rug",name:"Area rug",group:"Rugs",type:"rug",w:4,d:6,h:.035 },
  { key:"rug-small",name:"Small rug",group:"Rugs",type:"rug",w:3,d:5,h:.035 },
  { key:"radiator",name:"Radiator",group:"Fixtures",type:"radiator",w:3,d:.65,h:2,clearance:1,fixed:true },
  { key:"column",name:"Column",group:"Fixtures",type:"column",w:1,d:1,h:8,fixed:true },
  { key:"closet",name:"Built-in closet",group:"Fixtures",type:"wardrobe",w:4,d:2,h:7,clearance:2,fixed:true },
  { key:"custom",name:"Custom footprint",group:"Fixtures",type:"custom",w:2,d:2,h:2 },
];
export function newPiece(piece: LibraryPiece, room: SelectedRoom, items: FurnitureItem[], id: string): FurnitureItem {
  const item: FurnitureItem = {id,type:piece.type,label:piece.name,owner:"student",x_ft:0,y_ft:0,
    width_ft:piece.w,length_ft:piece.d,height_ft:piece.h,rotation_deg:0,movable:!piece.fixed,built_in:!!piece.fixed,
    color_category:piece.type==="bed"?"bedding":"storage",inventory:true,supply:piece.fixed?"school":"owned",assigned_to:"shared",
    dimensions_source:"generic",clearance_ft:piece.clearance??0,...(piece.type==="bed"?{bed_mode:"standard" as const}:{})};
  return findFreePosition(item, room, items) ?? {...item,x_ft:Math.max(0,(room.lengthFt-piece.w)/2),y_ft:Math.max(0,(room.widthFt-piece.d)/2)};
}
export function findFreePosition(item: FurnitureItem, room: SelectedRoom, items: FurnitureItem[]): FurnitureItem | null {
  const outline = roomOutline(room), b = footprint(item);
  for(let y=.15;y<=room.widthFt-b.h;y+=.5)for(let x=.15;x<=room.lengthFt-b.w;x+=.5){
    const candidate={...item,x_ft:x,y_ft:y}, corners=furnitureCorners(candidate);
    if(furnitureInsidePolygon(candidate,outline.points) && !items.some(f=>f.id!==item.id && f.type!=="rug" && polygonsOverlap(corners,furnitureCorners(f),.02)) && !outline.closets.some(c=>polygonsOverlap(corners,[{x:c.x_ft,y:c.y_ft},{x:c.x_ft+c.width_ft,y:c.y_ft},{x:c.x_ft+c.width_ft,y:c.y_ft+c.depth_ft},{x:c.x_ft,y:c.y_ft+c.depth_ft}],.02))) return candidate;
  }
  return null;
}
