/**
 * Audits the starting arrangement of every kind of planned room: runs the planner's own pipeline (template match, fit
 * to the room, budget split, product sync) for real school rooms in every style at three budgets, and lists every piece
 * standing somewhere it makes no sense (a desk lamp or monitor riser on the floor, two lamps on one desk, a piece
 * overlapping another or outside the room).
 *
 *   npx tsx --tsconfig tsconfig.json scripts/audit-arrangement.ts [--rooms N] [--extras] [--show]
 * --extras also adds every optional catalog extra, as if the student added them all.
 */
import { SCHOOLS } from "@/lib/schools";
import { matchTemplate } from "@/templates/template-matcher";
import { fitTemplateToRoom } from "@/lib/layout-fit";
import { productsFor, extrasFor, tierForBudget, isExtraCategory, unfilledSlots } from "@/lib/catalog";
import { productForFurniture, productVisual, syncProductFurniture } from "@/lib/product-model";
import { invalidItems } from "@/components/canvas/geometry";
import { itemElevation } from "@/lib/studio";
import { ALL_STYLE_IDS } from "@/lib/styles";
import { surfaceOnly } from "@/lib/product-model";
import type { FurnitureItem, Product, ProductCategory, SelectedRoom, StyleId } from "@/lib/types";

const args = process.argv.slice(2), N = Number(args[args.indexOf("--rooms") + 1]) || 100000, show = args.includes("--show"), extras = args.includes("--extras");

// Distinct real rooms: one per (type, occupants, rounded size), across all schools.
const rooms: SelectedRoom[] = [], seen = new Set<string>();
for (const s of SCHOOLS) for (const d of s.dorms ?? []) for (const r of (d as any).rooms ?? []) {
  if (!r.length_ft || !r.width_ft) continue;
  const key = `${r.type}|${r.occupants}|${Math.round(r.length_ft)}x${Math.round(r.width_ft)}`;
  if (seen.has(key)) continue; seen.add(key);
  rooms.push({ type: r.type, occupants: r.occupants ?? 2, lengthFt: r.length_ft, widthFt: r.width_ft, bedSize: r.bed_size ?? "twin_xl", source: "catalog" });
}

function plan(room: SelectedRoom, style: StyleId, budget: number) {
  const match = matchTemplate({ length_ft: room.lengthFt, width_ft: room.widthFt, occupants: room.occupants, room_type: room.type });
  let items = fitTemplateToRoom(match.template.furniture, match.template_id, room.lengthFt, room.widthFt);
  const products = [...productsFor(style, tierForBudget(budget, style), room.bedSize), ...extrasFor(style)];
  let remaining = budget; const excluded: ProductCategory[] = [];
  for (const p of products) { if (isExtraCategory(p.category)) { if (!extras) excluded.push(p.category); continue; } if (p.price <= remaining) remaining -= p.price; else excluded.push(p.category); }
  excluded.push(...unfilledSlots(style));
  const cart = products.filter(p => !excluded.includes(p.category));
  // The planner re-runs the sync on every change; run it to a fixed point.
  for (let i = 0; i < 4; i++) { const next = syncProductFurniture(items, cart, room); if (next === items) break; items = next; }
  return { items, cart, template: match.template_id };
}

type Problem = { room: string; style: string; budget: number; id: string; what: string };
const problems: Problem[] = [];
const styles = ALL_STYLE_IDS.filter(s => s !== "custom");
let plans = 0;
for (const room of rooms.slice(0, N)) for (const style of styles) for (const budget of [75, 200, 500]) {
  plans++;
  const { items, cart } = plan(room, style, budget);
  const tag = `${room.type} ${room.lengthFt}x${room.widthFt} (${room.occupants})`;
  const bad = (id: string, what: string) => problems.push({ room: tag, style, budget, id, what });
  const invalid = invalidItems(items, room.lengthFt, room.widthFt, room.outline);
  const onHost = new Map<string, string[]>();
  for (const f of items) {
    if (f.built_in || f.inventory) continue;
    const p = productForFurniture(f, cart as Product[]);
    if (!p) continue;
    const v = productVisual(p), elevated = itemElevation(f, items) > 0;
    if (surfaceOnly(v.kind, p.category) && !elevated) bad(f.id, `${v.kind} (${p.category}) on the floor`);
    if (invalid.has(f.id)) bad(f.id, `${v.kind} overlaps or leaves the room`);
    if (f.parent_id && v.kind === "lamp") { const k = f.parent_id; onHost.set(k, [...(onHost.get(k) ?? []), f.id]); }
  }
  for (const [host, lamps] of onHost) if (lamps.length > 1) bad(host, `${lamps.length} lamps on one ${host}`);
}
const byWhat = new Map<string, number>();
for (const p of problems) byWhat.set(p.what.replace(/\d+ lamps/, "N lamps"), (byWhat.get(p.what.replace(/\d+ lamps/, "N lamps")) ?? 0) + 1);
console.log(`${plans} plans over ${Math.min(N, rooms.length)} rooms × ${styles.length} styles × 3 budgets: ${problems.length} problems`);
for (const [w, n] of [...byWhat].sort((a, b) => b[1] - a[1]).slice(0, 25)) console.log(String(n).padStart(6), w);
if (show) for (const p of problems.slice(0, 40)) console.log(p);
