import type { BedSize, ClosetRect, Point, RoomOutline, SelectedRoom, WallOpening } from "./types";
import { DEFAULT_STUDIO, type StudioSettings } from "./studio";
import { sanitizeStudio } from "./studio-save";
import { openingAtPoint, roomEditError } from "./room-editing";

/** One connected, single-level room. Feet on an X/Z grid, not screen pixels. */
export interface BuilderDraft {
  version: 1;
  points: Point[];
  closed: boolean;
  openings: WallOpening[];
  closets: ClosetRect[];
  settings: StudioSettings;
  occupants: number;
  bedSize: BedSize;
}
export type BuilderTool = "select" | "floor" | "wall" | "door" | "window" | "closet" | "orbit";
export type BuilderSelection = { kind: "corner" | "wall" | "opening" | "closet"; index: number } | null;
export const BUILDER_LIMIT = 30;
export const BUILDER_MAX_CORNERS = 40;
export const emptyDraft = (): BuilderDraft => ({version:1,points:[],closed:false,openings:[],closets:[],settings:{...DEFAULT_STUDIO},occupants:1,bedSize:"twin_xl"});
export const builderOutline = (d: BuilderDraft): RoomOutline => ({points:d.points,openings:d.openings,closets:d.closets});
export const snapPoint = (p: Point, step = .5): Point => ({x:Math.max(-30,Math.min(30,Math.round(p.x/step)*step)),y:Math.max(-30,Math.min(30,Math.round(p.y/step)*step))});
export function roomArea(points: Point[]) { return Math.abs(points.reduce((a,p,i)=>{const q=points[(i+1)%points.length];return a+p.x*q.y-q.x*p.y;},0))/2; }
export function builderBounds(points: Point[]) {
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y);
  return {x:Math.min(...xs),y:Math.min(...ys),length:Math.max(...xs)-Math.min(...xs),width:Math.max(...ys)-Math.min(...ys)};
}
export function builderError(d: BuilderDraft): string | null {
  if(!d.closed)return "Close the walls to make a floor before continuing.";
  const path=pathError(d.points);if(path)return path;
  const closets=closetError(d.closets);if(closets)return closets;
  const geometry=roomEditError(builderOutline(d));
  if(geometry)return geometry;
  const b=builderBounds(d.points);
  if(b.length<4||b.width<4||roomArea(d.points)<16)return "Make a room at least 4 ft across in both directions, with 16 sq ft of floor space.";
  return null;
}
/** Used for both local draft restoration and server requests. Never trust stored JSON. */
export function parseBuilderDraft(input: unknown): BuilderDraft | null {
  if(!input||typeof input!=="object"||Array.isArray(input))return null;
  const d=input as Record<string,unknown>;
  const settings=sanitizeStudio(d.settings);
  if(d.version!==1||typeof d.closed!=="boolean"||!Array.isArray(d.points)||d.points.length>BUILDER_MAX_CORNERS||!Array.isArray(d.openings)||d.openings.length>20||!settings||!Number.isInteger(d.occupants)||(d.occupants as number)<1||(d.occupants as number)>4||!["twin","twin_xl","full","full_xl","queen"].includes(String(d.bedSize)))return null;
  const points:Point[]=[],openings:WallOpening[]=[];
  for(const raw of d.points){if(!raw||typeof raw!=="object")return null;const p=raw as Point;if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>BUILDER_LIMIT||Math.abs(p.y)>BUILDER_LIMIT)return null;points.push({x:p.x,y:p.y});}
  for(const raw of d.openings){if(!raw||typeof raw!=="object")return null;const o=raw as WallOpening;
    if(!["door","window"].includes(o.kind)||!Number.isInteger(o.edge)||o.edge<0||o.edge>=points.length||!Number.isFinite(o.offset_ft)||o.offset_ft<0||!Number.isFinite(o.width_ft)||o.width_ft<.5||o.width_ft>12||(o.swing!==undefined&&(!Number.isInteger(o.swing)||o.swing<0||o.swing>3)))return null;
    openings.push({kind:o.kind,edge:o.edge,offset_ft:o.offset_ft,width_ft:o.width_ft,...(o.kind==="door"?{swing:o.swing??0}:{})});
  }
  // Version-one drafts made before closet support remain valid.
  const rawClosets=d.closets===undefined?[]:d.closets;
  if(!Array.isArray(rawClosets)||closetError(rawClosets))return null;
  const closets:ClosetRect[]=rawClosets.map(c=>({x_ft:c.x_ft,y_ft:c.y_ft,width_ft:c.width_ft,depth_ft:c.depth_ft}));
  const result:BuilderDraft={version:1,points,openings,closets,closed:d.closed,settings,occupants:d.occupants as number,bedSize:d.bedSize as BedSize};
  if(pathError(points)||(result.closed?!!roomEditError(builderOutline(result)):openings.length>0||closets.length>0))return null;
  return result;
}
function cross(a:Point,b:Point,c:Point){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);}
function intersects(a:Point,b:Point,c:Point,d:Point){
  const on=(p:Point,q:Point,r:Point)=>Math.abs(cross(p,q,r))<1e-7&&r.x>=Math.min(p.x,q.x)-1e-7&&r.x<=Math.max(p.x,q.x)+1e-7&&r.y>=Math.min(p.y,q.y)-1e-7&&r.y<=Math.max(p.y,q.y)+1e-7;
  return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b);
}
export function pathError(points:Point[]):string|null {
  if(points.length>BUILDER_MAX_CORNERS)return "Use up to 40 corners for one room.";
  for(let i=1;i<points.length;i++){
    if(Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y)<.5)return "Leave at least 6 inches between corners.";
    // Reject doubling back along the immediately preceding wall too.
    if(i>1&&Math.abs(cross(points[i-2],points[i-1],points[i]))<1e-7&&(points[i].x-points[i-1].x)*(points[i-1].x-points[i-2].x)+(points[i].y-points[i-1].y)*(points[i-1].y-points[i-2].y)<0)return "Walls cannot double back on themselves.";
    for(let j=0;j<i-2;j++)if(intersects(points[j],points[j+1],points[i-1],points[i]))return "Walls cannot cross or touch. Undo the last corner and try again.";
  }return null;
}
export function moveBuilderCorner(d:BuilderDraft,index:number,p:Point):BuilderDraft|string {
  if(!Number.isInteger(index)||index<0||index>=d.points.length||!Number.isFinite(p.x)||!Number.isFinite(p.y)||Math.abs(p.x)>30||Math.abs(p.y)>30)return "Keep corners on the 60 ft grid.";
  const next={...d,points:d.points.map((v,i)=>i===index?p:v)};
  return pathError(next.points)??(d.closed?roomEditError(builderOutline(next)):null)??next;
}
export function splitBuilderWall(d:BuilderDraft,edge:number):BuilderDraft|string {
  if(!d.closed||!d.points[edge]||d.points.length>=BUILDER_MAX_CORNERS)return "A room can have up to 40 corners.";
  const a=d.points[edge],b=d.points[(edge+1)%d.points.length],half=Math.hypot(b.x-a.x,b.y-a.y)/2;
  if(d.openings.some(o=>o.edge===edge&&o.offset_ft<half&&o.offset_ft+o.width_ft>half))return "Move the opening away from the middle of this wall before splitting it.";
  const points=[...d.points];points.splice(edge+1,0,{x:(a.x+b.x)/2,y:(a.y+b.y)/2});
  const openings=d.openings.map(o=>o.edge===edge&&o.offset_ft>=half?{...o,edge:edge+1,offset_ft:o.offset_ft-half}:o.edge>edge?{...o,edge:o.edge+1}:o);
  const next={...d,points,openings};return roomEditError(builderOutline(next))??next;
}
export function removeBuilderCorner(d:BuilderDraft,index:number):BuilderDraft|string {
  if(!d.points[index])return "Choose a corner first.";
  if(d.closed&&d.points.length<=3)return "Keep at least three corners in a closed room.";
  const prev=(index-1+d.points.length)%d.points.length;
  if(d.openings.some(o=>o.edge===index||o.edge===prev))return "Remove openings on the two connected walls before removing this corner.";
  const next={...d,points:d.points.filter((_,i)=>i!==index),openings:d.openings.map(o=>o.edge>index?{...o,edge:o.edge-1}:o)};
  return (d.closed?roomEditError(builderOutline(next)):pathError(next.points))??next;
}
export function placeBuilderOpening(d:BuilderDraft,kind:WallOpening["kind"],point:Point,width:number,index=-1):BuilderDraft|string {
  if(!d.closed)return "Finish the floor and walls first.";
  if(!Number.isFinite(width)||width<.5||width>12)return "Opening widths can be 0.5 to 12 ft.";
  const source=index<0?{kind,width_ft:width,offset_ft:0,edge:0,...(kind==="door"?{swing:0}:{})}:d.openings[index];
  if(!source)return "Choose an opening first.";
  const opening=openingAtPoint(builderOutline(d),{...source,width_ft:width},point,index);
  if(!opening)return "No room for that opening here. Choose a longer, clear wall or reduce its width.";
  const next={...d,openings:index<0?[...d.openings,opening]:d.openings.map((o,i)=>i===index?opening:o)};
  return roomEditError(builderOutline(next))??next;
}
export function builderRoom(d:BuilderDraft):SelectedRoom {
  const error=builderError(d);if(error)throw Error(error);
  const b=builderBounds(d.points);
  return {type:(["single","double","triple","quad"] as const)[d.occupants-1],occupants:d.occupants,lengthFt:b.length,widthFt:b.width,bedSize:d.bedSize,source:"drawn",
    outline:{points:d.points.map(p=>({x:p.x-b.x,y:p.y-b.y})),openings:d.openings.map(o=>({...o})),closets:d.closets.map(c=>({...c,x_ft:c.x_ft-b.x,y_ft:c.y_ft-b.y}))},studio:{...d.settings}};
}

function closetError(closets:unknown[]):string|null {
  if(closets.length>20)return "A room can have up to 20 closets.";
  for(const raw of closets){
    if(!raw||typeof raw!=="object"||Array.isArray(raw))return "Enter valid closet measurements.";
    const c=raw as ClosetRect;
    if(!Number.isFinite(c.x_ft)||!Number.isFinite(c.y_ft)||Math.abs(c.x_ft)>BUILDER_LIMIT||Math.abs(c.y_ft)>BUILDER_LIMIT)return "Keep the closet on the 60 ft grid.";
    if(!Number.isFinite(c.width_ft)||!Number.isFinite(c.depth_ft)||c.width_ft<.5||c.depth_ft<.5||c.width_ft>20||c.depth_ft>20)return "Closet width and depth can be 0.5 to 20 ft.";
  }
  const items=closets as ClosetRect[];
  for(let i=0;i<items.length;i++)for(let j=i+1;j<items.length;j++){
    const a=items[i],b=items[j];
    if(a.x_ft<b.x_ft+b.width_ft-.001&&b.x_ft<a.x_ft+a.width_ft-.001&&a.y_ft<b.y_ft+b.depth_ft-.001&&b.y_ft<a.y_ft+a.depth_ft-.001)return "Leave space between closets; they cannot overlap.";
  }
  return null;
}
/** Exact measurements use the closet's lower X/Z corner, matching planner obstacles. */
export function editBuilderCloset(d:BuilderDraft,closet:ClosetRect,index=-1):BuilderDraft|string {
  if(!d.closed)return "Finish the floor and walls first.";
  if(!Number.isInteger(index)||index< -1||index>=d.closets.length)return "Choose a closet first.";
  const next={...d,closets:index===-1?[...d.closets,{...closet}]:d.closets.map((c,i)=>i===index?{...closet}:c)};
  return closetError(next.closets)??roomEditError(builderOutline(next))??next;
}
/** A pointer targets the center; snap its footprint and hug the outer room bounds. */
export function placeBuilderCloset(d:BuilderDraft,point:Point,width:number,depth:number,step=.5,index=-1):BuilderDraft|string {
  if(!d.closed)return "Finish the floor and walls first.";
  if(!Number.isFinite(point.x)||!Number.isFinite(point.y)||!Number.isFinite(step)||step<=0)return "Choose a position inside your room.";
  const b=builderBounds(d.points);
  if(point.x<b.x-.25||point.x>b.x+b.length+.25||point.y<b.y-.25||point.y>b.y+b.width+.25)return "Place the closet inside your walls.";
  return editBuilderCloset(d,{
    x_ft:Math.max(b.x,Math.min(b.x+b.length-width,Math.round((point.x-width/2)/step)*step)),
    y_ft:Math.max(b.y,Math.min(b.y+b.width-depth,Math.round((point.y-depth/2)/step)*step)),
    width_ft:width,depth_ft:depth,
  },index);
}
export function presetDraft(shape:"rectangle"|"l"|"alcove",length=14,width=12):BuilderDraft {
  const x=-length/2,y=-width/2;
  const points=shape==="l"?[[0,0],[length,0],[length,width*.55],[length*.55,width*.55],[length*.55,width],[0,width]]:shape==="alcove"?[[0,0],[length,0],[length,width*.65],[length*.8,width*.65],[length*.8,width],[length*.2,width],[length*.2,width*.65],[0,width*.65]]:[[0,0],[length,0],[length,width],[0,width]];
  return {...emptyDraft(),closed:true,points:points.map(([px,py])=>({x:px+x,y:py+y}))};
}
