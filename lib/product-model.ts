import type { FurnitureItem, Product, SelectedRoom } from "./types";
import { furnitureCategory } from "./highlight";
import { footprint, furnitureCorners, furnitureHost, furnitureInsidePolygon, invalidItems, layerOf, rectInsidePolygon } from "@/components/canvas/geometry";
import { bedSurfaceHeight, itemHeight, modelKind, roomOutline } from "./studio";
import { isSeasonalStyle } from "./styles";

const COLORS: Record<string, string> = {
  white:"#f5f1e8", cream:"#eee2c9", ivory:"#eee4d0", beige:"#c9b595", black:"#252629",
  grey:"#919397", gray:"#919397", silver:"#b9babc", gold:"#c4a267", brass:"#a68a48",
  navy:"#283952", blue:"#789aaf", green:"#6c8463", sage:"#a4b09b", olive:"#777b4d",
  pink:"#e5adc0", blush:"#deb3af", rose:"#bd8091", purple:"#ab96c0", lavender:"#c6b4d6",
  orange:"#c57543", brown:"#8c674b", walnut:"#75523d", yellow:"#e2bb62", mustard:"#c1a03d",
  red:"#ab5050", natural:"#bea27d", bamboo:"#c6ab7b", clear:"#cfdad8", houndstooth:"#c4c2b9",
  amber:"#d39a45",
};

/** Bulb colours a light string names ("orange purple", "multicolor"). White and warm strings keep the room's lamplight. */
const BULB: Record<string, string> = { orange:"#ff7a1a", purple:"#8e63c9", yellow:"#ffc24b", green:"#7bbf5a", red:"#e0483e", blue:"#5b7cff", pink:"#ff7fbf" };
function bulbColors(product: Product): string[] | undefined {
  const words = product.color.toLowerCase().split(/[^a-z]+/);
  if (words.some(word => word.startsWith("multi"))) return [BULB.orange, BULB.purple, BULB.green, BULB.yellow];
  const out = words.map(word => BULB[word]).filter(Boolean);
  return out.length ? out : undefined;
}

export function productColor(product: Product): string | undefined {
  if (/^#[0-9a-f]{6}$/i.test(product.color)) return product.color;
  const words = product.color.toLowerCase().split(/[^a-z]+/);
  return words.map(word => COLORS[word]).find(Boolean);
}

/**
 * A pasted or uncategorised product's model, read from its title: the pieces a dorm commonly gets that have no planner
 * category of their own (a mini fridge, a desk chair, a speaker). Ordered most specific first ("bookshelf" before "book",
 * "bean bag chair" before "chair"); null when nothing fits, so the caller keeps its own rules.
 */
const TEXT_KINDS: [string, RegExp][] = [
  ["fridge", /\b(mini ?fridge|refrigerator|fridge|beverage cooler|compact cooler)\b/],
  ["microwave", /\bmicrowave\b/],
  ["lounge", /\b(bean ?bag|floor chair|lounger|papasan|gaming floor)\b/],
  ["ottoman", /\b(ottoman|pouf|footstool|foot rest|footrest)\b/],
  ["sofa", /\b(sofa|loveseat|love seat|futon|couch|settee)\b/],
  // A chair mat, cushion or cover is not a chair.
  ["chair", /\bchairs?\b(?!\s*(mat|cushion|pad|cover|slipcover))/],
  ["shelf", /\b(bookshelf|bookshelves|bookcase|book case|shelving unit|ladder shelf|etagere|cube shelf)\b/],
  ["dresser", /\b(dresser|chest of drawers|nightstand|night stand|bedside table|drawer unit|rolling cart)\b/],
  ["riser", /\b(monitor riser|riser stand|monitor stand|laptop stand|desk riser)\b/],
  ["monitor", /\b(monitor|computer screen|display screen|television|tv)\b(?!\s*(stand|riser|arm|mount|light))/],
  ["speaker", /\b(speaker|soundbar|sound bar|subwoofer|bluetooth speaker|smart speaker|echo dot)\b/],
  ["fan", /\b(fan|air circulator)\b/],
  ["trash", /\b(trash can|waste ?basket|garbage can|recycling bin)\b/],
  ["hamper", /\b(hamper|laundry basket|laundry bag)\b/],
  ["storage", /\b(storage box|box with lid|lidded box|storage bins? with lids?|storage drawers?|stackable drawers?)\b/],
  ["basket", /\b(basket|storage bin|storage cube|bin)\b/],
];
export function furnitureKindFromText(text: string): string | null {
  const lower = text.toLowerCase();
  return TEXT_KINDS.find(([, re]) => re.test(lower))?.[0] ?? null;
}

/** ponytail: catalog text gives approximate silhouettes; manufacturer meshes are needed for exact replicas. */
export function productVisual(product: Product) {
  const text = `${product.name} ${product.description}`.toLowerCase();
  // The Halloween kit's own pieces: a jack-o'-lantern, a ghost or ghost lantern, bats on the wall.
  const pumpkin = /pumpkin|jack[- ]?o'?[- ]?lantern/.test(text), ghost = /ghost|lantern/.test(text);
  const seasonal = product.style_tags.some(isSeasonalStyle);
  let kind: string;
  switch (product.category) {
    case "bedding": kind = "bed"; break;
    case "rug": kind = "rug"; break;
    case "desk_lamp": kind = "lamp"; break;
    case "ambient_lighting": kind = /lamp|projector/.test(text) ? "lamp" : /disco/.test(text) ? "disco" : "lights"; break;
    case "wall_decor": case "tapestry": kind = /\bbats?\b/.test(text) ? "art" : /shel(f|ves)/.test(text) ? "wall-shelf" : /macrame/.test(text) ? "macrame" : /neon|light/.test(text) ? "lights" : "art"; break;
    case "storage": kind = /ottoman/.test(text) ? "ottoman" : /drawer/.test(text) ? "dresser" : /basket|cube|seagrass|wicker/.test(text) ? "basket" : "storage"; break;
    case "throw": kind = /pillow/.test(text) ? "pillow" : "blanket"; break;
    case "curtains": kind = "curtains"; break;
    case "desk_accessories": case "desk_organizer": kind = pumpkin ? "pumpkin" : /mat|pad/.test(text) ? "desk-mat" : /stand|riser/.test(text) ? "riser" : "organizer"; break;
    case "mirror": kind = "mirror"; break;
    case "laundry_hamper": kind = "hamper"; break;
    case "power_strip": kind = "power-strip"; break;
    case "trash_can": kind = "trash"; break;
    case "towel_caddy": kind = /towel set/.test(text) ? "towels" : "caddy"; break;
    case "plant": kind = "plant"; break;
    case "clip_fan": kind = "fan"; break;
    default: kind = pumpkin ? "pumpkin" : ghost ? "lantern" : furnitureKindFromText(text) ?? (/plant|tree|monstera|pothos|eucalyptus/.test(text) ? "plant" : /candle|tea ?light/.test(text) ? "candle" : /disco|mirror ball/.test(text) ? "disco" : /pillow/.test(text) ? "pillow" : /book/.test(text) ? "books" : /projector|lamp|diffuser/.test(text) ? "lamp" : "decor");
  }
  const variant = kind === "lamp"
    ? /mushroom/.test(text) ? "mushroom" : /banker/.test(text) ? "banker" : /lava/.test(text) ? "lava" : /salt/.test(text) ? "salt" : /projector/.test(text) ? "projector" : /light bar|under monitor/.test(text) ? "bar" : /swing|architect|gooseneck|clip|slim metal/.test(text) ? "task" : "shade"
    : kind === "plant" && /disco/.test(text) ? "disco"
    : kind === "mirror" ? /arch/.test(text) ? "arch" : /round/.test(text) ? "round" : "rect"
    : kind === "lights" ? /curtain|hang-down/.test(text) ? "curtain" : /strip|glide/.test(text) ? "strip" : /neon/.test(text) ? "neon" : "string"
    : kind === "art" && /\bbats?\b/.test(text) ? "bats"
    : kind === "lantern" ? /lantern|globe/.test(text) ? "lantern" : "ghost"
    : kind === "pumpkin" ? /glass|mercury/.test(text) ? "glass" : "plain"
    : /woven|wicker|seagrass|rattan|jute|rope/.test(text) ? "woven" : /clear|acrylic/.test(text) ? "clear" : /fluffy|fur|shag|sherpa/.test(text) ? "plush" : /knit|chenille/.test(text) ? "knit" : "plain";
  const pattern = /check|gingham|plaid|houndstooth/.test(text) ? "check" : /strip/.test(text) ? "stripe" : /floral|flower|botanical/.test(text) ? "floral" : /geometric|berber|tribal|medallion/.test(text) ? "diamond" : /abstract|wave|groovy/.test(text) ? "wave"
    : seasonal && kind === "blanket" ? "halloween" : "solid";
  // Lit pieces glow from inside; a multi-pack of small pieces (six jack-o'-lanterns, tea lights) sits as a cluster.
  const lit = /\b(led|light|lights|lantern|glow)\b/.test(text);
  const count = ["pumpkin", "candle"].includes(kind) ? Number(/(\d+)\s*-?\s*(?:pack|pcs?|pieces?)\b/.exec(text)?.[1]) || 1 : 1;
  const bulbs = kind === "lights" && variant === "string" ? bulbColors(product) : undefined;
  return { id:product.id, name:product.name, image:product.image_url, kind, variant, pattern, color:productColor(product), lit, count, bulbs, seasonal };
}

/** A throw slot holds either a throw blanket or throw pillows: true when it's a blanket (by its product, else by its type). */
/**
 * Pieces that belong on a desk, dresser or other top, never on the floor: lamps, screens, desk gear, small decor.
 * (A plant or a fan stands on the floor only when it's floor-sized.)
 */
const SURFACE_KINDS = new Set(["lamp", "monitor", "riser", "organizer", "desk-mat", "speaker", "books", "candle", "decor",
  "lantern", "pumpkin", "towels", "microwave"]);
export function surfaceOnly(kind: string, category?: string, heightFt?: number | null): boolean {
  if (SURFACE_KINDS.has(kind)) return true;
  if (kind === "plant" || kind === "fan") return category === "clip_fan" || (heightFt ?? 1) < 1.6;
  return false;
}
/** Pieces that belong on a desk in particular (they're desk gear), rather than any top. */
export const DESK_KINDS = new Set(["monitor", "riser", "organizer", "desk-mat", "speaker"]);

export function throwIsBlanket(item: FurnitureItem, product?: Product): boolean {
  if (item.type !== "throw" && item.type !== "throw_pillows") return false;
  return product ? productVisual(product).kind === "blanket" : item.type === "throw";
}

export function productForFurniture(item: FurnitureItem, products: Product[]): Product | undefined {
  if(item.inventory && !item.product_id && item.type!=="bed")return undefined;
  if(item.product_id){const exact=products.find(p=>p.id===item.product_id);if(exact)return exact;}
  return products.find(p => p.id === item.id) ?? products.find(p => p.category === furnitureCategory(item));
}

/** A cluster of up to six small pieces: three across, then a second row. */
function clusterSize(visual: ReturnType<typeof productVisual>, w: number, l: number): [number, number] {
  if (visual.count < 2) return [w, l];
  const n = Math.min(visual.count, 6), cols = Math.min(3, n), rows = Math.ceil(n / cols);
  return [Math.round(w * cols * 1.15 * 100) / 100, Math.round(l * rows * 1.15 * 100) / 100];
}

/**
 * Slides a seasonal wall piece along the wall it hangs on until it is clear of
 * that wall's doors and windows (a quarter foot either side), moving as little
 * as possible. Left where it is when the wall has no clear stretch long enough.
 */
function clearOfOpenings(f: FurnitureItem, room: SelectedRoom): void {
  const outline = roomOutline(room), pts = outline.points, b = footprint(f), c = {x:b.x+b.w/2, y:b.y+b.h/2};
  let edge = -1, gap = Infinity;
  pts.forEach((a, i) => {
    const z = pts[(i+1)%pts.length], len = Math.hypot(z.x-a.x, z.y-a.y) || 1, along = ((c.x-a.x)*(z.x-a.x)+(c.y-a.y)*(z.y-a.y))/len;
    const away = Math.abs((c.x-a.x)*(z.y-a.y)-(c.y-a.y)*(z.x-a.x))/len;
    if (along >= 0 && along <= len && away < gap) { gap = away; edge = i; }
  });
  if (edge < 0) return;
  const a = pts[edge], z = pts[(edge+1)%pts.length], len = Math.hypot(z.x-a.x, z.y-a.y), ux = (z.x-a.x)/len, uy = (z.y-a.y)/len;
  const half = f.width_ft/2, at = (c.x-a.x)*ux+(c.y-a.y)*uy;
  const blocked = outline.openings.filter(o => o.edge === edge).map(o => [o.offset_ft-.25, o.offset_ft+o.width_ft+.25]);
  const clear = (t: number) => t-half >= .25 && t+half <= len-.25 && blocked.every(([s, e]) => t+half <= s || t-half >= e);
  if (clear(at)) return;
  for (let d = .25; d < len; d += .25) for (const t of [at-d, at+d]) if (clear(t)) { f.x_ft += (t-at)*ux; f.y_ft += (t-at)*uy; return; }
}

const DEFAULT_SIZE: Record<string, [number, number, number]> = {
  curtains:[4,.18,5.25], organizer:[1.1,.65,.65], "desk-mat":[2.5,1.2,.02], riser:[1.5,.8,.4],
  plant:[.7,.7,1.2], towels:[1.2,.9,.45], caddy:[.8,.65,.9], fan:[.6,.5,.8], pumpkin:[.45,.45,.4], lantern:[.4,.4,.8],
  candle:[.35,.35,.65], disco:[1,1,1], books:[.8,1,.5], decor:[.7,.7,.7],
  blanket:[1.5,1,.16], "power-strip":[1,.3,.15], hamper:[1.5,1.5,2.2], trash:[1,1,1.4],
  lamp:[.7,.7,1.4], basket:[1,1,1], storage:[1,1,1],
  "wall-shelf":[3,.6,2.5], macrame:[2,.12,3], art:[3,.08,2.5], lights:[6,.15,.15],
};

/**
 * Usual sizes for a pasted item with no listing dimensions. Kept apart from DEFAULT_SIZE, which catalog swaps use: there a
 * missing size keeps the template slot's own, so pieces like rugs and dressers must stay out of it.
 */
const PASTED_SIZE: Record<string, [number, number, number]> = {
  ...DEFAULT_SIZE,
  fridge:[1.6,1.6,2.8], microwave:[1.5,1.1,.9], chair:[2,2,3.1], lounge:[3,3,2.3], ottoman:[1.3,1.3,1.4],
  shelf:[2.5,1,4.5], dresser:[2.6,1.5,2.6], speaker:[.45,.45,.75], monitor:[2,.7,1.5], sofa:[4.5,2.6,2.7],
  rug:[5,3,.035], mirror:[1.3,.15,4.8], pillow:[1.5,1,.4], bed:[3.25,6.6,2], plant:[1.4,1.4,2.6],
};

/** A product's footprint and height (ft) when its listing gives none: its model's usual size, else 2 × 2 × 1.5. */
export function defaultSizeFor(product: Product): [number, number, number] {
  const size = PASTED_SIZE[productVisual(product).kind] ?? [2, 2, 1.5];
  const pick = (value: number | null, fallback: number) => value && Number.isFinite(value) && value > 0 && value <= 40 ? value : fallback;
  return [pick(product.width_ft, size[0]), pick(product.length_ft, size[1]), pick(product.height_ft, size[2])];
}

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

/** Tops a piece can stand on, and which it prefers: desk gear goes on desks, lamps and decor on dressers and side tables. */
const SURFACE_HOSTS = ["desk", "dresser", "table", "shelf", "fridge"];
function hostOrder(kind: string, category: string | undefined, preferDesk: boolean): string[] {
  if (preferDesk || DESK_KINDS.has(kind) || category === "desk_lamp") return ["desk", "table", "dresser", "shelf"];
  if (kind === "microwave") return ["fridge", "dresser", "table", "desk"];
  return ["dresser", "table", "shelf", "desk"];
}

/**
 * Stands a small piece on a desk, dresser or other top: the preferred kind of top first and, among those, one that doesn't
 * already hold the same kind of piece (no two lamps on one desk). Tries both ways round, keeps a little gap from what's
 * already there, and centres a desk mat or a riser while lamps and decor take a corner. With `crowd`, it may sit closer
 * to its neighbours rather than end up on the floor. Returns false when no top in the room takes it.
 */
function placeOnSurface(item: FurnitureItem, items: FurnitureItem[], preferDesk: boolean, kind = "", category?: string, crowd = false): boolean {
  const order = hostOrder(kind, category, preferDesk), centred = kind === "desk-mat" || kind === "riser" || kind === "monitor";
  const isLamp = (f: FurnitureItem) => f.type === "desk_lamp" || f.type === "ambient_lighting" || /lamp/i.test(f.label ?? "");
  const same = (host: FurnitureItem) => items.some(f => f.parent_id === host.id && f.id !== item.id &&
    (kind === "lamp" ? isLamp(f) : f.product_category === category || f.type === item.type));
  const hosts = items.filter(f => SURFACE_HOSTS.includes(f.type) && f.id !== item.id && !f.parent_id)
    .sort((a, b) => Number(same(a)) - Number(same(b)) || order.indexOf(a.type) - order.indexOf(b.type));
  const gap = crowd ? .02 : .08;
  for (const host of hosts) {
    if (!order.includes(host.type)) continue;
    const b = footprint(host), hc = {x: b.x + b.w / 2, y: b.y + b.h / 2};
    let best: {x: number; y: number; rotation: number; score: number} | undefined;
    for (const rotation of [host.rotation_deg, (host.rotation_deg + 90) % 360]) {
      const trial = {...item, rotation_deg: rotation}, size = footprint(trial);
      if (size.w > b.w - .1 || size.h > b.h - .1) continue;
      for (let y = b.y + .05; y + size.h <= b.y + b.h - .05; y += .1) for (let x = b.x + .05; x + size.w <= b.x + b.w - .05; x += .1) {
        if (!furnitureInsidePolygon({...trial, x_ft: x, y_ft: y}, furnitureCorners(host))) continue;
        const blocked = items.some(f => f.parent_id === host.id && f.id !== item.id && (f.height_ft ?? 1) > .05 && (item.height_ft ?? 1) > .05 &&
          (() => { const a = footprint(f); return x < a.x + a.w + gap && x + size.w + gap > a.x && y < a.y + a.h + gap && y + size.h + gap > a.y; })());
        if (blocked) continue;
        const cx = x + size.w / 2, cy = y + size.h / 2, fromCentre = Math.hypot(cx - hc.x, cy - hc.y);
        // Centred pieces want the middle; corner pieces the farthest point from it. Same-way-round as the top breaks ties.
        const score = (centred ? fromCentre : -fromCentre) + (rotation === host.rotation_deg ? 0 : .01);
        if (!best || score < best.score) best = {x, y, rotation, score};
      }
    }
    if (best) { item.x_ft = best.x; item.y_ft = best.y; item.rotation_deg = best.rotation; item.parent_id = host.id; item.elevation_ft = itemHeight(host); return true; }
  }
  return false;
}

/** A piece that belongs on a top but isn't on one (and wasn't put there by hand): stand it on the best top there is. */
function settleOnSurface(item: FurnitureItem, items: FurnitureItem[], products: Product[]): void {
  if (item.built_in || item.inventory || item.parent_id || (item.elevation_ft ?? 0) > 0) return;
  const p = productForFurniture(item, products);
  if (!p) return;
  const v = productVisual(p);
  if (!surfaceOnly(v.kind, p.category, item.height_ft)) return;
  const prefer = DESK_KINDS.has(v.kind) || p.category === "desk_lamp";
  if (!placeOnSurface(item, items, prefer, v.kind, p.category)) placeOnSurface(item, items, prefer, v.kind, p.category, true);
}

/** Reconcile cart choices into the shared layout, so 2D, 3D, saving and editing agree. */
export function syncProductFurniture(items: FurnitureItem[], products: Product[], room: SelectedRoom): FurnitureItem[] {
  let changed = false;
  const result = items.map(f => {
    const p = productForFurniture(f, products);
    if (f.inventory || f.built_in || !p || f.product_id === p.id) return f;
    changed = true;
    const visual = productVisual(p), defaults = DEFAULT_SIZE[visual.kind];
    const host = furnitureHost(f, items);
    const size = (value: number | null, fallback: number) => value && Number.isFinite(value) && value > 0 && value <= 40 ? value : fallback;
    // Fabric drapes/folds into its existing footprint; unfolded dimensions aren't floor space.
    const fabric = ["blanket", "pillow", "lights", "art", "wall-shelf", "macrame"].includes(visual.kind);
    const [cw, cl] = clusterSize(visual, size(p.width_ft, defaults?.[0] ?? f.width_ft), size(p.length_ft, defaults?.[1] ?? f.length_ft));
    const next = {...f, product_id:p.id, label:p.name, parent_id:f.parent_id ?? host?.id,
      width_ft:fabric ? f.width_ft : cw,
      length_ft:fabric ? f.length_ft : cl,
      height_ft:Math.max(.02, Math.min(16,size(p.height_ft, defaults?.[2] ?? itemHeight({...f, type:visual.kind}))))};
    if (visual.kind === "blanket") {
      next.height_ft = .16;
      if(host){next.width_ft=host.width_ft*.98;next.length_ft=1.6;next.rotation_deg=host.rotation_deg;}
    }
    if (visual.kind === "lights" && visual.variant === "neon") {
      next.width_ft = p.width_ft ?? 2; next.length_ft = .08; next.height_ft = p.height_ft ?? 1.5; next.elevation_ft = 4;
    }
    // A sticker set is laid out over its catalog layout size, whatever the slot held before.
    if (visual.variant === "bats") {
      next.width_ft = p.width_ft ?? 3; next.length_ft = p.length_ft ?? .05; next.height_ft = p.height_ft ?? 2;
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
    if (visual.seasonal && ["art", "wall-shelf", "macrame"].includes(visual.kind)) clearOfOpenings(next, room);
    return next;
  });
  for (let i=0;i<result.length;i++) if(result[i]!==items[i]) { settleOnSurface(result[i],result,products); clearPosition(result[i],result,room); }
  for (const p of products) {
    if(result.length>=60)break;
    // Custom items have their own explicit placed/unplaced workflow.
    if (p.id.startsWith("custom-") || result.some(f => f.id === p.id || (!f.inventory && !f.built_in && furnitureCategory(f) === p.category)) || p.category === "bedding") continue;
    const visual = productVisual(p), size = DEFAULT_SIZE[visual.kind] ?? [.8,.8,1];
    const wall = ["curtains", "art", "lights", "wall-shelf", "macrame"].includes(visual.kind);
    const surface = surfaceOnly(visual.kind, p.category, p.height_ft ?? size[2]) || ["fan", "caddy", "plant"].includes(visual.kind);
    const [w, l] = clusterSize(visual, p.width_ft ?? size[0], p.length_ft ?? size[1]);
    const f: FurnitureItem = {id:`cart-${p.category}`, product_id:p.id, type:wall ? "wall_decor" : p.category,
      label:p.name, owner:"shared", x_ft:0, y_ft:0, width_ft:w, length_ft:l, height_ft:p.height_ft ?? size[2],
      rotation_deg:0, movable:true, built_in:false, color_category:"decor", product_category:p.category};
    // A light string runs along the wall it hangs on, however long the strand.
    if (visual.kind === "lights") f.width_ft = Math.min(f.width_ft, Math.max(1, room.lengthFt - .5));
    const deskFirst = DESK_KINDS.has(visual.kind) || p.category === "desk_lamp" || ["fan","pumpkin","lantern"].includes(visual.kind);
    if (surface && (placeOnSurface(f,result,deskFirst,visual.kind,p.category) || (surfaceOnly(visual.kind, p.category, f.height_ft) && placeOnSurface(f,result,deskFirst,visual.kind,p.category,true)))) {
      // Surface placement records its parent, so movement and rotation stay linked.
    } else if (wall) {
      f.x_ft=Math.max(0,(room.lengthFt-f.width_ft)/2); f.y_ft=.12; f.elevation_ft=Math.max(0,6.7-f.height_ft!);
      if (visual.seasonal && visual.kind !== "lights" && visual.kind !== "curtains") clearOfOpenings(f, room);
      const outline=roomOutline(room),opening=outline.openings.find(o=>o.kind==="window");
      if (visual.kind==="curtains" && opening) {
        const a=outline.points[opening.edge],b=outline.points[(opening.edge+1)%outline.points.length];
        const length=Math.hypot(b.x-a.x,b.y-a.y),dx=(b.x-a.x)/length,dy=(b.y-a.y)/length;
        f.width_ft=opening.width_ft+.4; f.rotation_deg=Math.atan2(dy,dx)*180/Math.PI;
        const bounds=footprint(f),center=opening.offset_ft+opening.width_ft/2;
        f.x_ft=Math.max(.05,Math.min(room.lengthFt-bounds.w-.05,a.x+dx*center-bounds.w/2));
        f.y_ft=Math.max(.05,Math.min(room.widthFt-bounds.h-.05,a.y+dy*center-bounds.h/2));
      }
    } else if (visual.seasonal && visual.kind === "rug") {
      // A seasonal rug goes in the open floor: the clear spot nearest the middle of the room.
      const pts = roomOutline(room).points, spots: {x:number;y:number}[] = [];
      for (let y=.25; y+f.length_ft<=room.widthFt; y+=.25) for (let x=.25; x+f.width_ft<=room.lengthFt; x+=.25) spots.push({x,y});
      const mid = {x:(room.lengthFt-f.width_ft)/2, y:(room.widthFt-f.length_ft)/2};
      spots.sort((a,b)=>Math.hypot(a.x-mid.x,a.y-mid.y)-Math.hypot(b.x-mid.x,b.y-mid.y));
      const spot = spots.find(({x,y}) => rectInsidePolygon({x,y,w:f.width_ft,h:f.length_ft},pts) &&
        !result.some(other=>other.type!=="rug" && !other.elevation_ft && (()=>{const a=footprint(other);return x<a.x+a.w&&x+f.width_ft>a.x&&y<a.y+a.h&&y+f.length_ft>a.y;})()));
      f.x_ft = spot?.x ?? Math.max(0, mid.x); f.y_ft = spot?.y ?? Math.max(0, mid.y);
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
