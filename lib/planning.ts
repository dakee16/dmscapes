import type { FurnitureItem, Point, Product, SelectedRoom } from "./types";
import { furnitureContainsPoint, furnitureCorners, furnitureInsidePolygon, furnitureLocalPoint, footprint, pointInPolygon, polygonsOverlap, rectCorners, rotateFurniture } from "@/components/canvas/geometry";
import { bedMetrics } from "./bed-config";
import { productForFurniture } from "./product-model";
import { itemElevation, itemHeight, modelKind, placementIssues, roomOutline, studioSettings } from "./studio";

export interface Roommate { id: string; name: string; color: string }
export interface LayoutAlternative { id: string; name: string; furniture: FurnitureItem[]; createdAt: string }
export interface PlanningDetails {
  mode: "manual" | "generated";
  name: string;
  roommates: Roommate[];
  showOwners: boolean;
  walkwayFt: number;
  alternatives: LayoutAlternative[];
  lastPanel: string;
  productSupply: Record<string, { supply: "school" | "owned" | "buy"; assignedTo: string }>;
}
export const DEFAULT_PLANNING: PlanningDetails = {mode:"generated",name:"My room",roommates:[],showOwners:false,walkwayFt:2,alternatives:[],lastPanel:"furnish",productSupply:{}};
export const OWNER_COLORS = ["#3052ef","#b54b79","#168071","#a25c11","#7955ad","#447d9c","#876d41","#666779"];
export const supplyFor=(f:FurnitureItem)=>f.supply??(f.built_in?"school":"buy");
/** Bedding decorates a provided bed; it is not a purchase of that bed. */
export function purchaseForPiece(f:FurnitureItem,products:Product[]){
  return f.built_in||(f.inventory&&!f.product_id)?undefined:productForFurniture(f,products);
}
/** Keep the canvas assignment and shopping ledger in agreement in either panel. */
export function assignOwnership(items:FurnitureItem[],details:PlanningDetails,products:Product[],target:{itemId?:string;productId?:string},patch:Partial<{supply:"school"|"owned"|"buy";assignedTo:string}>){
  const item=items.find(f=>f.id===target.itemId),productId=target.productId??(item?purchaseForPiece(item,products)?.id:undefined);
  const previous=(productId?details.productSupply[productId]:undefined)??{supply:item?supplyFor(item):"buy",assignedTo:item?.assigned_to??"shared"};
  const value={...previous,...patch};
  return {furniture:items.map(f=>f.id===target.itemId||(productId&&purchaseForPiece(f,products)?.id===productId)?{...f,supply:value.supply,assigned_to:value.assignedTo}:f),planning:productId?{...details,productSupply:{...details.productSupply,[productId]:value}}:details};
}
export function ownerName(id:string|undefined, roommates:Roommate[]) { return roommates.find(r=>r.id===id)?.name??"Shared"; }
export function shoppingProducts(products:Product[], details:PlanningDetails) {
  return products.filter(p=>(details.productSupply[p.id]?.supply??"buy")==="buy");
}
export function assignedCosts(items:FurnitureItem[],products:Product[],details:PlanningDetails) {
  const totals:Record<string,number>={shared:0};for(const r of details.roommates)totals[r.id]=0;
  for(const p of shoppingProducts(products,details)){const owner=details.productSupply[p.id]?.assignedTo??"shared";totals[owner]=(totals[owner]??0)+p.price;}
  for(const f of items.filter(f=>f.inventory&&supplyFor(f)==="buy"&&!f.product_id)){const owner=f.assigned_to??"shared";totals[owner]=(totals[owner]??0)+(f.cost??0);}
  return totals;
}
/** Keep an alternative about arrangement, not stale ownership, prices or inventory. */
export function mergeArrangement(current:FurnitureItem[],proposed:FurnitureItem[],locked:string[]):FurnitureItem[]{
  const protectedIds=new Set([...locked,...current.filter(f=>!f.movable).map(f=>f.id)]);
  // An attachment and its host form one arrangement. Protect the whole family,
  // including when a host was locked after this alternative was created.
  for(let pass=0;pass<current.length;pass++)for(const f of current)if(f.parent_id){
    if(protectedIds.has(f.id))protectedIds.add(f.parent_id);
    if(protectedIds.has(f.parent_id))protectedIds.add(f.id);
  }
  const next=current.map(f=>{const p=proposed.find(p=>p.id===f.id);if(!p||!f.movable||protectedIds.has(f.id))return f;
    return {...f,x_ft:p.x_ft,y_ft:p.y_ft,rotation_deg:p.rotation_deg,...(p.bed_mode?{bed_mode:p.bed_mode,height_ft:p.height_ft}:{}),...(f.parent_id?{elevation_ft:p.elevation_ft}: {})};});
  // Pieces added after an alternative was kept remain attached to their host.
  return next.map(f=>{
    if(!f.parent_id||protectedIds.has(f.id)||proposed.some(p=>p.id===f.id))return f;
    const before=current.find(p=>p.id===f.parent_id),after=next.find(p=>p.id===f.parent_id);if(!before||!after)return f;
    const a=footprint(before),b=footprint(after),rotated=rotateFurniture(f,after.rotation_deg-before.rotation_deg,{x:a.x+a.w/2,y:a.y+a.h/2});
    return {...rotated,x_ft:rotated.x_ft+b.x+b.w/2-a.x-a.w/2,y_ft:rotated.y_ft+b.y+b.h/2-a.y-a.h/2};
  });
}
export function moveFamily(items:FurnitureItem[],next:FurnitureItem):FurnitureItem[]{
  const before=items.find(f=>f.id===next.id);if(!before)return items;
  const dx=next.x_ft-before.x_ft,dy=next.y_ft-before.y_ft;
  return items.map(f=>f.id===next.id?next:f.parent_id===next.id?{...f,x_ft:f.x_ft+dx,y_ft:f.y_ft+dy}:f);
}
export interface PlanIssue { key:string; itemId?:string; title:string; detail:string; level:"warning"|"info"; region?:Point[] }
export interface RoomAnalysis { issues:PlanIssue[]; areaFt2:number; openFloorFt2:number; connectedFloorFt2:number|null; beds:number; sampleFt:number }
const nonSolid=new Set(["rug","art","lights","mirror"]);
function pointBlocked(p:Point,f:FurnitureItem,items:FurnitureItem[],walking=false,margin=0) {
  if(nonSolid.has(modelKind(f))||itemElevation(f,items)>6)return false;
  const local=furnitureLocalPoint(f,p),bed=bedMetrics(f);
  if(bed?.mode==="lofted" && (!walking||bed.underside>=6)){
    return Math.abs(local.x)>f.width_ft/2-.22-margin&&Math.abs(local.y)>f.length_ft/2-.22-margin&&Math.abs(local.x)<f.width_ft/2+margin&&Math.abs(local.y)<f.length_ft/2+margin;
  }
  return Math.abs(local.x)<f.width_ft/2+margin&&Math.abs(local.y)<f.length_ft/2+margin;
}
/** Region directly in front (+local y) of drawers, desks and appliances. */
export function clearanceRegion(f:FurnitureItem):Point[] {
  const clearance=f.clearance_ft??(["desk","dresser","wardrobe","fridge"].includes(modelKind(f))?2:0);
  const box=footprint(f),r=f.rotation_deg*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
  return [{x:-f.width_ft/2,y:f.length_ft/2},{x:f.width_ft/2,y:f.length_ft/2},{x:f.width_ft/2,y:f.length_ft/2+clearance},{x:-f.width_ft/2,y:f.length_ft/2+clearance}].map(p=>({x:box.x+box.w/2+p.x*c-p.y*s,y:box.y+box.h/2+p.x*s+p.y*c}));
}
/** Approximate union on a 3-inch grid; overlapping pieces are counted once. */
export function analyzeRoom(items:FurnitureItem[],room:SelectedRoom,walkwayFt=2):RoomAnalysis {
  const outline=roomOutline(room),issues:PlanIssue[]=placementIssues(items,room,studioSettings(room.studio)).map((x,i)=>({key:`placement-${i}`,itemId:x.id,title:x.message,detail:"Select the highlighted piece and adjust its position or dimensions.",level:"warning"}));
  const add=(x:PlanIssue)=>issues.push(x);
  let beds=0;
  for(const f of items){
    const bed=bedMetrics(f);beds+=bed?.capacity??0;
    if(bed && (bed.mode==="lofted"||bed.mode==="bunked")){
      if(!f.loft_confirmed)add({key:`loft-policy-${f.id}`,itemId:f.id,title:"Confirm raised-bed permission",detail:"School permission, the approved bed kit, ladder and guardrail requirements must be checked with housing.",level:"info"});
      const headroom=studioSettings(room.studio).ceilingFt-bed.mattress-itemElevation(f,items);
      if(headroom<3)add({key:`headroom-${f.id}`,itemId:f.id,title:`Only ${headroom.toFixed(1)} ft above the upper mattress`,detail:"This planning check uses 3 ft of headroom. Confirm the actual mattress, ceiling and school requirements.",level:"warning"});
    }
    const region=clearanceRegion(f),clearance=f.clearance_ft??(["desk","dresser","wardrobe","fridge"].includes(modelKind(f))?2:0);
    if(clearance>0){
      const blockers=items.filter(o=>o.id!==f.id&&!nonSolid.has(modelKind(o))&&!(modelKind(f)==="desk"&&modelKind(o)==="chair")&&polygonsOverlap(region,furnitureCorners(o),.03));
      if(blockers.length||region.some(p=>!pointInPolygon(p.x,p.y,outline.points)))add({key:`clearance-${f.id}`,itemId:f.id,title:`Keep the front of ${f.label.toLowerCase()} clear`,detail:`${clearance} ft is reserved for ${modelKind(f)==="desk"?"a chair and getting up":"opening and access"}.${blockers.length?" Blocked by "+blockers.map(f=>f.label).join(", ")+".":" The space crosses a wall."} Edit the clearance in item details.`,level:"warning",region});
    }
    if(itemHeight(f)>3.5&&!nonSolid.has(modelKind(f)))for(const [i,w] of outline.openings.entries()){
      if(w.kind!=="window")continue;
      const a=outline.points[w.edge],b=outline.points[(w.edge+1)%outline.points.length],l=Math.hypot(b.x-a.x,b.y-a.y),p={x:a.x+(b.x-a.x)*(w.offset_ft+w.width_ft/2)/l,y:a.y+(b.y-a.y)*(w.offset_ft+w.width_ft/2)/l};
      if(pointBlocked(p,f,items,false,.5))add({key:`window-${i}-${f.id}`,itemId:f.id,title:"Check window access",detail:"Tall furniture is close to a window. Measure the sill and preserve opening and egress access.",level:"warning"});
    }
  }
  outline.closets.forEach((c,i)=>{const region=rectCorners({x:c.x_ft,y:c.y_ft+c.depth_ft,w:c.width_ft,h:2});const hit=items.find(f=>!nonSolid.has(modelKind(f))&&polygonsOverlap(region,furnitureCorners(f),.02));if(hit)add({key:`closet-${i}`,itemId:hit.id,title:"Closet approach is blocked",detail:"Keep 2 ft in front of this closet. Its opening is assumed to face into the plan; confirm the actual door direction.",region,level:"warning"});});
  if(beds<room.occupants)add({key:"sleep-capacity",title:`${beds} sleeping place${beds===1?"":"s"} for ${room.occupants} people`,detail:"Add a bed or configure an approved bunk. Lofted beds sleep one person.",level:"warning"});
  const byType=new Map<string,FurnitureItem[]>();for(const f of items.filter(f=>f.assigned_to==="shared"&&["fridge","microwave"].includes(f.type))){const values=byType.get(f.type)??[];values.push(f);byType.set(f.type,values);}
  for(const [type,list] of byType)if(list.length>1)add({key:`duplicate-${type}`,itemId:list[0].id,title:`${list.length} shared ${type}s`,detail:"Check who is bringing this so you do not buy a duplicate.",level:"info"});
  const step=.25,nx=Math.ceil(room.lengthFt/step),ny=Math.ceil(room.widthFt/step),walk=new Uint8Array(nx*ny),radius=Math.max(1,Math.min(4,walkwayFt))/2;
  let open=0;
  const inCloset=(p:Point,margin=0)=>outline.closets.some(c=>p.x>=c.x_ft-margin&&p.x<c.x_ft+c.width_ft+margin&&p.y>=c.y_ft-margin&&p.y<c.y_ft+c.depth_ft+margin);
  for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
    const p={x:(x+.5)*step,y:(y+.5)*step};if(!pointInPolygon(p.x,p.y,outline.points))continue;
    if(!inCloset(p)&&!items.some(f=>pointBlocked(p,f,items)))open+=step*step;
    if(!inCloset(p,radius)&&!items.some(f=>pointBlocked(p,f,items,true,radius))&&[[-radius,-radius],[radius,-radius],[radius,radius],[-radius,radius]].every(([dx,dy])=>pointInPolygon(p.x+dx,p.y+dy,outline.points)))walk[y*nx+x]=1;
  }
  const doors=outline.openings.filter(o=>o.kind==="door");let connected:number|null=null;
  if(doors.length){
    const entrance=doors[0],a=outline.points[entrance.edge],b=outline.points[(entrance.edge+1)%outline.points.length],l=Math.hypot(b.x-a.x,b.y-a.y),p={x:a.x+(b.x-a.x)*(entrance.offset_ft+entrance.width_ft/2)/l,y:a.y+(b.y-a.y)*(entrance.offset_ft+entrance.width_ft/2)/l};
    let seed=-1,distance=radius+step*3;
    for(let i=0;i<walk.length;i++)if(walk[i]){const d=Math.hypot((i%nx+.5)*step-p.x,(Math.floor(i/nx)+.5)*step-p.y);if(d<distance){seed=i;distance=d;}}
    const queue:number[]=[];if(seed>=0){queue.push(seed);walk[seed]=2;}
    for(let h=0;h<queue.length;h++){const v=queue[h],x=v%nx,y=Math.floor(v/nx);for(const [xx,yy] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const next=yy*nx+xx;if(xx>=0&&xx<nx&&yy>=0&&yy<ny&&walk[next]===1){walk[next]=2;queue.push(next);}}}
    connected=queue.length*step*step;
    if(seed<0)add({key:"entrance",title:"No clear route from the first door",detail:`A ${walkwayFt} ft route could not reach the room. Confirm the entrance and move furniture away from it.`,region:rectCorners({x:Math.max(0,p.x-1),y:Math.max(0,p.y-1),w:2,h:2}),level:"warning"});
    else for(const f of items.filter(f=>bedMetrics(f)||modelKind(f)==="desk")){
      const reach=queue.some(i=>{const local=furnitureLocalPoint(f,{x:(i%nx+.5)*step,y:(Math.floor(i/nx)+.5)*step});return modelKind(f)==="desk"?Math.abs(local.x)<f.width_ft/2+radius&&local.y>=f.length_ft/2&&local.y<f.length_ft/2+radius+.75:Math.abs(local.x)<f.width_ft/2+radius+.5&&Math.abs(local.y)<f.length_ft/2+radius+.5;});
      if(!reach)add({key:`route-${f.id}`,itemId:f.id,title:`No clear route to ${f.label.toLowerCase()}`,detail:`The first door cannot reach this piece on a ${walkwayFt} ft path. Try rotating it or widening the gap. This is a planning estimate, not an accessibility certification.`,level:"warning"});
    }
  } else add({key:"missing-door",title:"Add your entrance to check routes",detail:"Record the real door position in Room. Routes use the first door and your selected clear width.",level:"info"});
  const area=Math.abs(outline.points.reduce((sum,p,i)=>{const n=outline.points[(i+1)%outline.points.length];return sum+p.x*n.y-n.x*p.y;},0))/2;
  return {issues,areaFt2:area,openFloorFt2:Math.min(area,Math.round(open*10)/10),connectedFloorFt2:connected===null?null:Math.round(connected*10)/10,beds,sampleFt:step};
}

export const LAYOUT_INTENTS = [
  {id:"balanced",name:"Balanced",detail:"Personal zones on opposite sides, with a shared center."},
  {id:"open",name:"Open center",detail:"Furniture at the perimeter for more open floor."},
  {id:"study",name:"Study first",detail:"Desks near windows, with working space in front."},
  {id:"privacy",name:"Personal zones",detail:"Keep each roommate's bed and desk together."},
  {id:"loft",name:"Loft & study",detail:"An approved loft above each desk. Confirm school rules first."},
  {id:"storage",name:"Storage access",detail:"Prioritize clear fronts on wardrobes and drawers."},
  {id:"accessible",name:"Wider routes",detail:"Favor 3 ft circulation. Verify access needs and measurements."},
] as const;
export type LayoutIntent = typeof LAYOUT_INTENTS[number]["id"];
/** Propose a copy only. Locked pieces and fixtures remain exact; no implicit edits. */
export function proposeLayout(items:FurnitureItem[],room:SelectedRoom,locked:string[],intent:LayoutIntent):FurnitureItem[] {
  const outline=roomOutline(room),frozen=new Set(locked);
  for(let pass=0;pass<items.length;pass++)for(const f of items)if(f.parent_id&&frozen.has(f.id))frozen.add(f.parent_id);
  const fixed=items.filter(f=>!f.movable||frozen.has(f.id)),placed=[...fixed];
  const moving=items.filter(f=>f.movable&&!frozen.has(f.id)&&!f.parent_id).sort((a,b)=>b.width_ft*b.length_ft-a.width_ft*a.length_ft);
  const owners=[...new Set(items.map(f=>f.assigned_to??"shared"))];
  for(const original of moving){
    const f=intent==="loft"&&bedMetrics(original)&&original.loft_confirmed?{...original,bed_mode:"lofted" as const,height_ft:6.2}:original;
    let best: FurnitureItem=f, score=Infinity;
    for(const rotation of [0,90,180,270]){const shape={...f,rotation_deg:rotation},size=footprint(shape);
      // Perimeter and coarse interior candidates keep large rooms responsive.
      const stride=Math.max(.5,Math.max(room.lengthFt,room.widthFt)/24);
      for(let y=.1;y<=room.widthFt-size.h;y+=stride)for(let x=.1;x<=room.lengthFt-size.w;x+=stride){
        const candidate={...shape,x_ft:x,y_ft:y};if(!furnitureInsidePolygon(candidate,outline.points))continue;
        const corners=furnitureCorners(candidate);
        const collisions=nonSolid.has(modelKind(candidate))?0:placed.filter(p=>!nonSolid.has(modelKind(p))&&polygonsOverlap(corners,furnitureCorners(p),.02)).length+outline.closets.filter(c=>polygonsOverlap(corners,rectCorners({x:c.x_ft,y:c.y_ft,w:c.width_ft,h:c.depth_ft}),.02)).length;
        let doorPenalty=0;for(const door of outline.openings.filter(o=>o.kind==="door")){const a=outline.points[door.edge],b=outline.points[(door.edge+1)%outline.points.length],l=Math.hypot(b.x-a.x,b.y-a.y);const center={x:a.x+(b.x-a.x)*(door.offset_ft+door.width_ft/2)/l,y:a.y+(b.y-a.y)*(door.offset_ft+door.width_ft/2)/l};if(pointBlocked(center,candidate,placed,false,intent==="accessible"?1.5:1))doorPenalty+=1000;}
        const edge=Math.min(x,y,room.lengthFt-x-size.w,room.widthFt-y-size.h),owner=owners.indexOf(f.assigned_to??"shared");
        let value=collisions*1000+doorPenalty+edge*(intent==="open"||intent==="accessible"?15:4);
        if(intent==="balanced"||intent==="privacy")value+=Math.abs(x-(owner%2?room.lengthFt-size.w:0))*(intent==="privacy"?5:2);
        if(intent==="study"&&modelKind(f)==="desk"){
          const windows=outline.openings.filter(o=>o.kind==="window").map(o=>outline.points[o.edge]);
          value+=windows.length?Math.min(...windows.map(p=>Math.hypot(x-p.x,y-p.y)))*3:y*2;
        }
        if((intent==="storage"||intent==="accessible"||modelKind(f)==="desk")&&clearanceRegion(candidate).some(p=>!pointInPolygon(p.x,p.y,outline.points)||placed.some(o=>furnitureContainsPoint(o,p))))value+=50;
        value+=Math.hypot(x-original.x_ft,y-original.y_ft)*.01;
        if(value<score){score=value;best=candidate;}
      }
    }
    placed.push(best);
  }
  if(intent==="loft")for(const bed of placed.filter(f=>bedMetrics(f)?.mode==="lofted")){
    const desk=placed.find(f=>modelKind(f)==="desk"&&f.assigned_to===bed.assigned_to&&f.movable&&!locked.includes(f.id));
    if(desk){const candidate={...desk,rotation_deg:bed.rotation_deg+90},a=footprint(bed),b=footprint(candidate);candidate.x_ft=a.x+(a.w-b.w)/2;candidate.y_ft=a.y+(a.h-b.h)/2;
      if(furnitureCorners(candidate).every(p=>{const q=furnitureLocalPoint(bed,p);return Math.abs(q.x)<bed.width_ft/2-.18&&Math.abs(q.y)<bed.length_ft/2-.18;}))placed[placed.indexOf(desk)]=candidate;}
  }
  for(const child of items.filter(f=>f.parent_id&&!fixed.includes(f))){const before=items.find(f=>f.id===child.parent_id),after=placed.find(f=>f.id===child.parent_id);if(before&&after){const a=footprint(before),b=footprint(after),rotated=rotateFurniture(child,after.rotation_deg-before.rotation_deg,{x:a.x+a.w/2,y:a.y+a.h/2});placed.push({...rotated,x_ft:rotated.x_ft+b.x+b.w/2-a.x-a.w/2,y_ft:rotated.y_ft+b.y+b.h/2-a.y-a.h/2});}else placed.push(child);}
  return items.map(f=>placed.find(p=>p.id===f.id)??f);
}
export function suggestedMove(item:FurnitureItem,items:FurnitureItem[],room:SelectedRoom,locked:string[]):FurnitureItem|null {
  if(!item.movable||locked.includes(item.id)||items.some(f=>f.parent_id===item.id&&locked.includes(f.id)))return null;
  const before=placementIssues(items,room,studioSettings(room.studio)).filter(i=>i.id===item.id).length;
  let best:FurnitureItem|null=null,score=before*1000+100;
  const b=footprint(item);
  for(let y=.1;y<=room.widthFt-b.h;y+=.5)for(let x=.1;x<=room.lengthFt-b.w;x+=.5){const candidate={...item,x_ft:x,y_ft:y};if(!furnitureInsidePolygon(candidate,roomOutline(room).points))continue;
    const next=moveFamily(items,candidate),n=placementIssues(next,room,studioSettings(room.studio)).filter(i=>i.id===item.id).length;
    const value=n*1000+Math.hypot(x-item.x_ft,y-item.y_ft);if(value<score&&n<before){score=value;best=candidate;}}
  return best;
}
