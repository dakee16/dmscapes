import type { FurnitureItem, Product, SelectedRoom } from "./types";
import { furnitureCategory } from "./highlight";
import { footprint, furnitureCorners, furnitureHost, furnitureInsidePolygon, invalidItems, layerOf, rectInsidePolygon } from "@/components/canvas/geometry";
import { bedSurfaceHeight, itemHeight, modelKind, roomOutline } from "./studio";

const COLORS: Record<string, string> = {
  white:"#f5f1e8", cream:"#eee2c9", ivory:"#eee4d0", beige:"#c9b595", black:"#252629",
  grey:"#919397", gray:"#919397", silver:"#b9babc", gold:"#c4a267", brass:"#a68a48",
  navy:"#283952", blue:"#789aaf", green:"#6c8463", sage:"#a4b09b", olive:"#777b4d",
  pink:"#e5adc0", blush:"#deb3af", rose:"#bd8091", purple:"#ab96c0", lavender:"#c6b4d6",
  orange:"#c57543", brown:"#8c674b", walnut:"#75523d", yellow:"#e2bb62", mustard:"#c1a03d",
  red:"#ab5050", natural:"#bea27d", bamboo:"#c6ab7b", clear:"#cfdad8", houndstooth:"#c4c2b9",
};

export function productColor(product: Product): string | undefined {
  if (/^#[0-9a-f]{6}$/i.test(product.color)) return product.color;
  const words = product.color.toLowerCase().split(/[^a-z]+/);
  return words.map(word => COLORS[word]).find(Boolean);
}

/** ponytail: catalog text gives approximate silhouettes; manufacturer meshes are needed for exact replicas. */
export function productVisual(product: Product) {
  const text = `${product.name} ${product.description}`.toLowerCase();
  let kind: string;
  switch (product.category) {
    case "bedding": kind = "bed"; break;
    case "rug": kind = "rug"; break;
    case "desk_lamp": kind = "lamp"; break;
    case "ambient_lighting": kind = /lamp|projector/.test(text) ? "lamp" : /disco/.test(text) ? "disco" : "lights"; break;
    case "wall_decor": case "tapestry": kind = /shel(f|ves)/.test(text) ? "wall-shelf" : /macrame/.test(text) ? "macrame" : /neon|light/.test(text) ? "lights" : "art"; break;
    case "storage": kind = /ottoman/.test(text) ? "ottoman" : /drawer/.test(text) ? "dresser" : /basket|cube|seagrass|wicker/.test(text) ? "basket" : "storage"; break;
    case "throw": kind = /pillow/.test(text) ? "pillow" : "blanket"; break;
    case "curtains": kind = "curtains"; break;
    case "desk_accessories": case "desk_organizer": kind = /mat|pad/.test(text) ? "desk-mat" : /stand|riser/.test(text) ? "riser" : "organizer"; break;
    case "mirror": kind = "mirror"; break;
    case "laundry_hamper": kind = "hamper"; break;
    case "power_strip": kind = "power-strip"; break;
    case "trash_can": kind = "trash"; break;
    case "towel_caddy": kind = /towel set/.test(text) ? "towels" : "caddy"; break;
    case "plant": kind = "plant"; break;
    case "clip_fan": kind = "fan"; break;
    default: kind = /plant|tree|monstera|pothos|eucalyptus/.test(text) ? "plant" : /candle/.test(text) ? "candle" : /disco|mirror ball/.test(text) ? "disco" : /pillow/.test(text) ? "pillow" : /book/.test(text) ? "books" : /projector|lamp|diffuser/.test(text) ? "lamp" : "decor";
  }
  const variant = kind === "lamp"
    ? /mushroom/.test(text) ? "mushroom" : /banker/.test(text) ? "banker" : /lava/.test(text) ? "lava" : /salt/.test(text) ? "salt" : /projector/.test(text) ? "projector" : /light bar|under monitor/.test(text) ? "bar" : /swing|architect|gooseneck|clip|slim metal/.test(text) ? "task" : "shade"
    : kind === "plant" && /disco/.test(text) ? "disco"
    : kind === "mirror" ? /arch/.test(text) ? "arch" : /round/.test(text) ? "round" : "rect"
    : kind === "lights" ? /curtain|hang-down/.test(text) ? "curtain" : /strip|glide/.test(text) ? "strip" : /neon/.test(text) ? "neon" : "string"
    : /woven|wicker|seagrass|rattan|jute|rope/.test(text) ? "woven" : /clear|acrylic/.test(text) ? "clear" : /fluffy|fur|shag|sherpa/.test(text) ? "plush" : /knit|chenille/.test(text) ? "knit" : "plain";
  const pattern = /check|gingham|plaid|houndstooth/.test(text) ? "check" : /strip/.test(text) ? "stripe" : /floral|flower|botanical/.test(text) ? "floral" : /geometric|berber|tribal|medallion/.test(text) ? "diamond" : /abstract|wave|groovy/.test(text) ? "wave" : "solid";
  return { id:product.id, name:product.name, image:product.image_url, kind, variant, pattern, color:productColor(product) };
}

export function productForFurniture(item: FurnitureItem, products: Product[]): Product | undefined {
  return products.find(p => p.id === item.id) ?? products.find(p => p.category === furnitureCategory(item));
}

const DEFAULT_SIZE: Record<string, [number, number, number]> = {
  curtains:[4,.18,5.25], organizer:[1.1,.65,.65], "desk-mat":[2.5,1.2,.02], riser:[1.5,.8,.4],
  plant:[.7,.7,1.2], towels:[1.2,.9,.45], caddy:[.8,.65,.9], fan:[.6,.5,.8],
  candle:[.35,.35,.65], disco:[1,1,1], books:[.8,1,.5], decor:[.7,.7,.7],
  blanket:[1.5,1,.16], "power-strip":[1,.3,.15], hamper:[1.5,1.5,2.2], trash:[1,1,1.4],
  lamp:[.7,.7,1.4], basket:[1,1,1], storage:[1,1,1],
  "wall-shelf":[3,.6,2.5], macrame:[2,.12,3], art:[3,.08,2.5], lights:[6,.15,.15],
};

function clearPosition(item: FurnitureItem, items: FurnitureItem[], room: SelectedRoom) {
  if (item.parent_id || layerOf(item) !== "solid") return;
  const others = items.filter(f=>f.id!==item.id);
  const fits = (f: FurnitureItem) => !invalidItems([...others,f],room.lengthFt,room.widthFt,room.outline).has(f.id);
  if (fits(item)) return;
  const b=footprint(item);let best: {x:number;y:number;distance:number} | undefined;
  for(let y=.15;y+b.h<=room.widthFt;y+=.5) for(let x=.15;x+b.w<=room.lengthFt;x+=.5){
    const distance=(x-item.x_ft)**2+(y-item.y_ft)**2;
    if ((!best || distance<best.distance) && fits({...item,x_ft:x,y_ft:y})) best={x,y,distance};
  }
  if(best){item.x_ft=best.x;item.y_ft=best.y;}
}

function placeOnSurface(item: FurnitureItem, items: FurnitureItem[], preferDesk: boolean): boolean {
  const hosts=items.filter(f=>f.type==="desk"||f.type==="dresser").sort((a,b)=>Number(b.type===(preferDesk?"desk":"dresser"))-Number(a.type===(preferDesk?"desk":"dresser")));
  for(const host of hosts){
    const b=footprint(host),size=footprint(item);
    for(let y=b.y+.08;y+size.h<=b.y+b.h-.08;y+=.2) for(let x=b.x+.08;x+size.w<=b.x+b.w-.08;x+=.2){
      if(!furnitureInsidePolygon({...item,x_ft:x,y_ft:y},furnitureCorners(host)))continue;
      const blocked=items.some(f=>f.parent_id===host.id && (f.height_ft??1)>.05 && (item.height_ft??1)>.05 && (()=>{const a=footprint(f);return x<a.x+a.w+.08&&x+size.w+.08>a.x&&y<a.y+a.h+.08&&y+size.h+.08>a.y;})());
      if(!blocked){item.x_ft=x;item.y_ft=y;item.parent_id=host.id;item.elevation_ft=itemHeight(host);return true;}
    }
  }
  return false;
}

/** Reconcile cart choices into the shared layout, so 2D, 3D, saving and editing agree. */
export function syncProductFurniture(items: FurnitureItem[], products: Product[], room: SelectedRoom): FurnitureItem[] {
  let changed = false;
  const result = items.map(f => {
    const p = productForFurniture(f, products);
    if (f.built_in || !p || f.product_id === p.id) return f;
    changed = true;
    const visual = productVisual(p), defaults = DEFAULT_SIZE[visual.kind];
    const host = furnitureHost(f, items);
    const size = (value: number | null, fallback: number) => value && Number.isFinite(value) && value > 0 && value <= 40 ? value : fallback;
    // Fabric drapes/folds into its existing footprint; unfolded dimensions aren't floor space.
    const fabric = ["blanket", "pillow", "lights", "art", "wall-shelf", "macrame"].includes(visual.kind);
    const next = {...f, product_id:p.id, label:p.name, parent_id:f.parent_id ?? host?.id,
      width_ft:fabric ? f.width_ft : size(p.width_ft, defaults?.[0] ?? f.width_ft),
      length_ft:fabric ? f.length_ft : size(p.length_ft, defaults?.[1] ?? f.length_ft),
      height_ft:Math.max(.02, Math.min(16,size(p.height_ft, defaults?.[2] ?? itemHeight({...f, type:visual.kind}))))};
    if (visual.kind === "blanket") {
      next.height_ft = .16;
      if(host){next.width_ft=host.width_ft*.98;next.length_ft=1.6;next.rotation_deg=host.rotation_deg;}
    }
    if (visual.kind === "lights" && visual.variant === "neon") {
      next.width_ft = p.width_ft ?? 2; next.length_ft = .08; next.height_ft = p.height_ft ?? 1.5; next.elevation_ft = 4;
    }
    if (f.type === "string_lights" && visual.kind !== "lights") {
      next.type = p.category;
      next.elevation_ft = 0;
    }
    if (host && p.category === "storage" && next.height_ft > bedSurfaceHeight(host)-.4) {next.parent_id=undefined;next.elevation_ft=0;}
    else if (host && !["storage", "basket"].includes(visual.kind)) next.elevation_ft = ["bed","bunk"].includes(modelKind(host)) ? bedSurfaceHeight(host) : itemHeight(host);
    const old = footprint(f), box = footprint(next);
    // Preserve the long-axis orientation on a catalog swap (4×6 versus an authored 6×4 rug).
    if ((old.w > old.h) !== (box.w > box.h) && visual.kind === "rug") next.rotation_deg = (next.rotation_deg + 90) % 360;
    const b = footprint(next);
    next.x_ft = Math.max(0, Math.min(room.lengthFt-b.w, old.x+(old.w-b.w)/2));
    next.y_ft = Math.max(0, Math.min(room.widthFt-b.h, old.y+(old.h-b.h)/2));
    if(visual.kind==="blanket" && host){
      const bed=footprint(host),a=host.rotation_deg*Math.PI/180,offset=(host.length_ft-next.length_ft)/2-.2;
      next.x_ft=bed.x+bed.w/2-Math.sin(a)*offset-b.w/2;
      next.y_ft=bed.y+bed.h/2+Math.cos(a)*offset-b.h/2;
    }
    return next;
  });
  for (let i=0;i<result.length;i++) if(result[i]!==items[i]) clearPosition(result[i],result,room);
  for (const p of products) {
    // Custom items have their own explicit placed/unplaced workflow.
    if (p.id.startsWith("custom-") || result.some(f => f.id === p.id || (!f.built_in && furnitureCategory(f) === p.category)) || p.category === "bedding") continue;
    const visual = productVisual(p), size = DEFAULT_SIZE[visual.kind] ?? [.8,.8,1];
    const wall = ["curtains", "art", "lights", "wall-shelf", "macrame"].includes(visual.kind);
    const surface = ["organizer", "desk-mat", "riser", "fan", "candle", "books", "towels", "caddy", "decor", "plant"].includes(visual.kind);
    const f: FurnitureItem = {id:`cart-${p.category}`, product_id:p.id, type:wall ? "wall_decor" : p.category,
      label:p.name, owner:"shared", x_ft:0, y_ft:0, width_ft:p.width_ft ?? size[0], length_ft:p.length_ft ?? size[1], height_ft:p.height_ft ?? size[2],
      rotation_deg:0, movable:true, built_in:false, color_category:"decor", product_category:p.category};
    if (surface && placeOnSurface(f,result,["organizer","desk-mat","riser","fan"].includes(visual.kind))) {
      // Surface placement records its parent, so movement and rotation stay linked.
    } else if (wall) {
      f.x_ft=Math.max(0,(room.lengthFt-f.width_ft)/2); f.y_ft=.12; f.elevation_ft=Math.max(0,6.7-f.height_ft!);
      const opening=room.outline?.openings.find(o=>o.kind==="window");
      if (visual.kind==="curtains" && opening && room.outline) {
        const a=room.outline.points[opening.edge],b=room.outline.points[(opening.edge+1)%room.outline.points.length];
        const length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
        f.width_ft=opening.width_ft+.4; f.rotation_deg=Math.atan2(dy,dx)*180/Math.PI;
        const bounds=footprint(f),center=opening.offset_ft+opening.width_ft/2;
        f.x_ft=Math.max(.05,Math.min(room.lengthFt-bounds.w-.05,a.x+dx*center-bounds.w/2));
        f.y_ft=Math.max(.05,Math.min(room.widthFt-bounds.h-.05,a.y+dy*center-bounds.h/2));
      }
    } else {
      // Small extras take the first clear perimeter slot, with a half-foot gap.
      let placed = false;
      for (let y=.25; y+f.length_ft<=room.widthFt && !placed; y+=.5) for (let x=.25; x+f.width_ft<=room.lengthFt; x+=.5) {
        const b={x,y,w:f.width_ft,h:f.length_ft};
        if (!rectInsidePolygon(b,roomOutline(room).points)) continue;
        if (result.some(other=>other.type!=="rug" && !other.elevation_ft && (()=>{const a=footprint(other);return x<a.x+a.w+.5&&x+b.w+.5>a.x&&y<a.y+a.h+.5&&y+b.h+.5>a.y;})())) continue;
        f.x_ft=x;f.y_ft=y;placed=true;break;
      }
      if (!placed) continue;
    }
    result.push(f); changed=true;
  }
  return changed ? result : items;
}
