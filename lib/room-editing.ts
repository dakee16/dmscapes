import type { Point, RoomOutline } from "./types";
import { rectInsidePolygon } from "@/components/canvas/geometry";

/** Reject broken walls before committing an edit to either planner view. */
export function roomEditError({points,openings,closets}:RoomOutline):string|null {
  if(points.length<3||points.length>100||points.some(p=>!Number.isFinite(p.x)||!Number.isFinite(p.y)))return "Use at least three valid corners to enclose the room.";
  const lengths=points.map((p,i)=>Math.hypot(p.x-points[(i+1)%points.length].x,p.y-points[(i+1)%points.length].y));
  if(lengths.some(n=>n<.5))return "Leave at least 6 inches between corners.";
  const area=Math.abs(points.reduce((sum,p,i)=>{const q=points[(i+1)%points.length];return sum+p.x*q.y-q.x*p.y;},0))/2;
  if(area<1)return "Keep at least one square foot inside the walls.";
  for(const axis of ["x","y"] as const)if(Math.max(...points.map(p=>p[axis]))-Math.min(...points.map(p=>p[axis]))>60)return "Room dimensions can be up to 60 ft.";
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
  const on=(a:Point,b:Point,c:Point)=>Math.abs(cross(a,b,c))<1e-7&&c.x>=Math.min(a.x,b.x)-1e-7&&c.x<=Math.max(a.x,b.x)+1e-7&&c.y>=Math.min(a.y,b.y)-1e-7&&c.y<=Math.max(a.y,b.y)+1e-7;
  for(let i=0;i<points.length;i++)for(let j=i+1;j<points.length;j++){
    if(j===i+1||(i===0&&j===points.length-1))continue;
    const a=points[i],b=points[(i+1)%points.length],c=points[j],d=points[(j+1)%points.length];
    if((cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)||on(a,b,c)||on(a,b,d)||on(c,d,a)||on(c,d,b))return "Walls cannot cross or touch another wall. Move the corner back inside the outline.";
  }
  if(openings.length>20)return "A room can have up to 20 doors and windows.";
  for(let i=0;i<openings.length;i++){
    const o=openings[i];
    if(!Number.isInteger(o.edge)||!Number.isFinite(o.offset_ft)||!Number.isFinite(o.width_ft)||o.width_ft<.5||o.offset_ft<0||o.edge<0||o.edge>=points.length||o.offset_ft+o.width_ft>lengths[o.edge]+.001)return "A door or window no longer fits. Move or resize it before shortening this wall.";
    if(openings.some((b,j)=>i!==j&&b.edge===o.edge&&b.offset_ft<o.offset_ft+o.width_ft-.001&&o.offset_ft<b.offset_ft+b.width_ft-.001))return "Leave space between doors and windows.";
  }
  if(closets.some(c=>!rectInsidePolygon({x:c.x_ft,y:c.y_ft,w:c.width_ft,h:c.depth_ft},points)))return "A closet would be outside the room. Move it first, then adjust the walls.";
  return null;
}

