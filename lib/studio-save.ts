import type { FurnitureItem, Product, ProductCategory } from "./types";
import { studioSettings, type StudioSettings } from "./studio";
import { DEFAULT_PLANNING, type PlanningDetails } from "./planning";

export interface SavedEditorState {
  hiddenItemIds: string[];
  lockedItemIds: string[];
  excluded: ProductCategory[];
  customItems: Product[];
  unplacedItemIds: string[];
  customProducts: Product[] | null;
  customVibe: string | null;
  customMock: boolean;
  customRegenUsed: boolean;
  cartProducts: Product[];
  planning?: PlanningDetails;
}
const finite=(n:unknown,min:number,max:number)=>typeof n==="number"&&Number.isFinite(n)&&n>=min&&n<=max;
const categories=new Set(["bedding","rug","desk_lamp","ambient_lighting","wall_decor","storage","throw","curtains","desk_accessories","mirror","laundry_hamper","power_strip","trash_can","towel_caddy","accent","plant","tapestry","desk_organizer","clip_fan"]);
function ids(value:unknown):string[]|null{
  if(!Array.isArray(value)||value.length>60||value.some(v=>typeof v!=="string"||v.length>80))return null;
  return [...new Set(value)] as string[];
}
function https(value:unknown,shopping=false):value is string {
  if(typeof value!=="string"||value.length>2000)return false;
  try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&(!shopping||u.hostname==="amzn.to"||u.hostname==="amazon.com"||u.hostname.endsWith(".amazon.com"));}catch{return false;}
}
function products(value:unknown):Product[]|null {
  if(!Array.isArray(value)||value.length>60)return null;
  const out:Product[]=[];
  for(const raw of value){
    if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
    const p=raw as Record<string,unknown>;
    if(typeof p.id!=="string"||p.id.length>80||typeof p.name!=="string"||p.name.length>300||!categories.has(String(p.category))||!finite(p.price,0,100000)||!https(p.affiliate_url,true)||!https(p.image_url))return null;
    const dims:Record<string,number|null>={};
    for(const key of ["width_ft","length_ft","height_ft"]){if(p[key]!=null&&!finite(p[key],0,60))return null;dims[key]=p[key] as number|null??null;}
    out.push({id:p.id,name:p.name,category:p.category as ProductCategory,price:p.price as number,
      affiliate_url:p.affiliate_url,image_url:p.image_url,amazon_asin:typeof p.amazon_asin==="string"?p.amazon_asin.slice(0,20):"",
      width_ft:dims.width_ft,length_ft:dims.length_ft,height_ft:dims.height_ft,
      style_tags:[],budget_tier:["budget","mid","premium"].includes(String(p.budget_tier))?p.budget_tier as Product["budget_tier"]:"budget",
      color:typeof p.color==="string"?p.color.slice(0,60):"",rating:finite(p.rating,0,5)?p.rating as number:0,
      review_count:finite(p.review_count,0,100000000)?p.review_count as number:0,alternative_ids:[],
      description:typeof p.description==="string"?p.description.slice(0,1000):"",active:true,
      ...(["twin","twin_xl","full","full_xl"].includes(String(p.bed_size))?{bed_size:p.bed_size as Product["bed_size"]}:{})});
  }
  return out;
}
export function sanitizeStudio(value:unknown):StudioSettings|null{
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const v=value as Record<string,unknown>;
  if(!finite(v.ceilingFt,6,16)||!["oak","walnut","concrete","carpet"].includes(String(v.floor))||typeof v.wallColor!=="string"||!/^#[0-9a-f]{6}$/i.test(v.wallColor)||!["day","evening"].includes(String(v.lighting)))return null;
  return studioSettings(v as unknown as StudioSettings);
}
export function sanitizeEditor(value:unknown):SavedEditorState|null {
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const e=value as Record<string,unknown>,hidden=ids(e.hiddenItemIds),locked=ids(e.lockedItemIds),excluded=ids(e.excluded),unplaced=ids(e.unplacedItemIds);
  const custom=products(e.customItems),cart=products(e.cartProducts),customProducts=e.customProducts==null?null:products(e.customProducts);
  if(!hidden||!locked||!excluded||excluded.some(c=>!categories.has(c))||!unplaced||!custom||!cart||(e.customProducts!=null&&!customProducts))return null;
  if(e.customVibe!=null&&(typeof e.customVibe!=="string"||e.customVibe.length>2000))return null;
  const planning=e.planning===undefined?undefined:sanitizePlanning(e.planning);
  if(e.planning!==undefined&&!planning)return null;
  return {hiddenItemIds:hidden,lockedItemIds:locked,excluded:excluded as ProductCategory[],unplacedItemIds:unplaced,
    customItems:custom,cartProducts:cart,customProducts,customVibe:e.customVibe as string|null??null,customMock:e.customMock===true,customRegenUsed:e.customRegenUsed===true,...(planning?{planning}:{})};
}
export function sanitizeItem3D(raw:Record<string,unknown>):Partial<FurnitureItem>|null {
  const out:Partial<FurnitureItem>={};
  if(raw.height_ft!==undefined){if(!finite(raw.height_ft,.02,16))return null;out.height_ft=raw.height_ft as number;}
  if(raw.elevation_ft!==undefined){if(!finite(raw.elevation_ft,0,16))return null;out.elevation_ft=raw.elevation_ft as number;}
  if(raw.material_color!==undefined){if(typeof raw.material_color!=="string"||!/^#[0-9a-f]{6}$/i.test(raw.material_color))return null;out.material_color=raw.material_color;}
  if(raw.parent_id!==undefined){if(typeof raw.parent_id!=="string"||raw.parent_id.length>60)return null;out.parent_id=raw.parent_id;}
  if(raw.product_id!==undefined){if(typeof raw.product_id!=="string"||raw.product_id.length>100)return null;out.product_id=raw.product_id;}
  if(raw.bed_mode!==undefined){if(!["standard","raised","lofted","bunked"].includes(String(raw.bed_mode)))return null;out.bed_mode=raw.bed_mode as FurnitureItem["bed_mode"];}
  for(const key of ["inventory","loft_confirmed"] as const)if(raw[key]!==undefined){if(typeof raw[key]!=="boolean")return null;out[key]=raw[key];}
  if(raw.supply!==undefined){if(!["school","owned","buy"].includes(String(raw.supply)))return null;out.supply=raw.supply as FurnitureItem["supply"];}
  if(raw.dimensions_source!==undefined){if(!["generic","measured","product"].includes(String(raw.dimensions_source)))return null;out.dimensions_source=raw.dimensions_source as FurnitureItem["dimensions_source"];}
  if(raw.assigned_to!==undefined){if(typeof raw.assigned_to!=="string"||raw.assigned_to.length>60)return null;out.assigned_to=raw.assigned_to;}
  if(raw.cost!==undefined){if(!finite(raw.cost,0,100000))return null;out.cost=raw.cost as number;}
  if(raw.clearance_ft!==undefined){if(!finite(raw.clearance_ft,0,6))return null;out.clearance_ft=raw.clearance_ft as number;}
  return out;
}

/** Used for both shared layouts and comparison snapshots. Empty rooms are valid. */
export function sanitizeFurnitureList(input:unknown):FurnitureItem[]|null {
  if(!Array.isArray(input)||input.length>60)return null;
  const out:FurnitureItem[]=[];
  for(const raw of input){
    if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
    const f=raw as Record<string,unknown>,spatial=sanitizeItem3D(f);
    if(!spatial||typeof f.id!=="string"||!f.id||f.id.length>60||out.some(x=>x.id===f.id))return null;
    if(!["x_ft","y_ft","width_ft","length_ft","rotation_deg"].every(k=>finite(f[k],-1000,1000))||!finite(f.width_ft,.02,60)||!finite(f.length_ft,.02,60))return null;
    out.push({...spatial,id:f.id,type:typeof f.type==="string"?f.type.slice(0,60):"unknown",label:typeof f.label==="string"?f.label.slice(0,120):"Item",owner:typeof f.owner==="string"?f.owner.slice(0,20):"shared",
      x_ft:f.x_ft as number,y_ft:f.y_ft as number,width_ft:f.width_ft as number,length_ft:f.length_ft as number,rotation_deg:f.rotation_deg as number,movable:!!f.movable,built_in:!!f.built_in,color_category:typeof f.color_category==="string"?f.color_category.slice(0,30):"decor",
      ...(typeof f.product_category==="string"?{product_category:f.product_category.slice(0,40)}:{})});
  }
  for(const item of out){let parent=item.parent_id;const seen=new Set([item.id]);while(parent){if(seen.has(parent))return null;seen.add(parent);const host=out.find(f=>f.id===parent);if(!host)return null;parent=host.parent_id;}}
  return out;
}
export function sanitizePlanning(value:unknown):PlanningDetails|null {
  if(!value||typeof value!=="object"||Array.isArray(value))return null;
  const p=value as Record<string,unknown>;
  if(!["manual","generated"].includes(String(p.mode))||typeof p.name!=="string"||p.name.length>80||!finite(p.walkwayFt,1,4)||!Array.isArray(p.roommates)||p.roommates.length>8||!Array.isArray(p.alternatives)||p.alternatives.length>3)return null;
  const out:PlanningDetails={...DEFAULT_PLANNING,mode:p.mode as PlanningDetails["mode"],name:p.name,walkwayFt:p.walkwayFt as number,roommates:[],alternatives:[],productSupply:{},showOwners:p.showOwners===true,lastPanel:["furnish","shop","room","style","checks","layouts","roommates","help"].includes(String(p.lastPanel))?String(p.lastPanel):"furnish"};
  for(const raw of p.roommates){if(!raw||typeof raw!=="object"||typeof raw.id!=="string"||raw.id.length>60||raw.id==="shared"||out.roommates.some(r=>r.id===raw.id)||typeof raw.name!=="string"||!raw.name.trim()||raw.name.length>40||!/^#[0-9a-f]{6}$/i.test(raw.color))return null;out.roommates.push({id:raw.id,name:raw.name,color:raw.color});}
  for(const raw of p.alternatives){const furniture=sanitizeFurnitureList(raw?.furniture);if(!raw||typeof raw.id!=="string"||raw.id.length>60||typeof raw.name!=="string"||raw.name.length>80||typeof raw.createdAt!=="string"||raw.createdAt.length>40||!furniture)return null;out.alternatives.push({id:raw.id,name:raw.name,createdAt:raw.createdAt,furniture});}
  if(p.productSupply!==undefined){if(!p.productSupply||typeof p.productSupply!=="object"||Array.isArray(p.productSupply))return null;const entries=Object.entries(p.productSupply);if(entries.length>120)return null;for(const [id,value] of entries){const v=value as {supply:unknown;assignedTo:unknown};if(id.length>100||!v||!["school","owned","buy"].includes(String(v.supply))||typeof v.assignedTo!=="string"||v.assignedTo.length>60)return null;out.productSupply[id]={supply:v.supply as "school"|"owned"|"buy",assignedTo:v.assignedTo};}}
  return out;
}
