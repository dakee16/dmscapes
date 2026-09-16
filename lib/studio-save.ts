import type { FurnitureItem, Product, ProductCategory } from "./types";
import { studioSettings, type StudioSettings } from "./studio";

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
  return {hiddenItemIds:hidden,lockedItemIds:locked,excluded:excluded as ProductCategory[],unplacedItemIds:unplaced,
    customItems:custom,cartProducts:cart,customProducts,customVibe:e.customVibe as string|null??null,customMock:e.customMock===true,customRegenUsed:e.customRegenUsed===true};
}
export function sanitizeItem3D(raw:Record<string,unknown>):Partial<FurnitureItem>|null {
  const out:Partial<FurnitureItem>={};
  if(raw.height_ft!==undefined){if(!finite(raw.height_ft,.02,16))return null;out.height_ft=raw.height_ft as number;}
  if(raw.elevation_ft!==undefined){if(!finite(raw.elevation_ft,0,16))return null;out.elevation_ft=raw.elevation_ft as number;}
  if(raw.material_color!==undefined){if(typeof raw.material_color!=="string"||!/^#[0-9a-f]{6}$/i.test(raw.material_color))return null;out.material_color=raw.material_color;}
  if(raw.parent_id!==undefined){if(typeof raw.parent_id!=="string"||raw.parent_id.length>60)return null;out.parent_id=raw.parent_id;}
  if(raw.product_id!==undefined){if(typeof raw.product_id!=="string"||raw.product_id.length>100)return null;out.product_id=raw.product_id;}
  return out;
}
