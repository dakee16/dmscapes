"use client";
import { useMemo, useState } from "react";
import ProductImage from "@/components/products/ProductImage";
import { ArrowUpRight } from "@/components/ds/Icons";
import { usePlannerStore } from "@/lib/store";
import { assignOwnership, assignedCosts, purchaseForPiece, supplyFor } from "@/lib/planning";
import type { FurnitureItem, Product } from "@/lib/types";
import type { WorkspaceDetail } from "@/lib/workspace";
import CollaborationOverlay from "./CollaborationOverlay";
import { useWorkspacePeople } from "./WorkspaceContext";
import { money, possessive } from "./people";
import { CommentIcon } from "./RoomBar";
import s from "./Room.module.css";

type Supply = "school" | "owned" | "buy";
type Line = { key: string; name: string; price: number; supply: Supply; who: string; product?: Product; piece?: FurnitureItem; target: string };
const DUPLICATE_TYPES: Record<string, [string, string]> = { fridge: ["mini fridge", "mini fridges"], microwave: ["microwave", "microwaves"] };
const COUNT = ["", "One", "Two", "Three", "Four", "Five", "Six"];

/** Who brings what: every purchase and brought-from-home piece on one board,
 * grouped by who is getting it, with each person's spend. */
export default function BringBoard({ detail, userId, products, commentOn, showOnPlan }: {
  detail: WorkspaceDetail; userId: string; products: Product[];
  commentOn: (target: string) => void; showOnPlan: (itemId: string) => void;
}) {
  const furniture = usePlannerStore(st => st.furniture) ?? [], planning = usePlannerStore(st => st.planning), budget = usePlannerStore(st => st.budget);
  const people = useWorkspacePeople(planning.roommates);
  const [kept, setKept] = useState<string[]>([]);
  const canEdit = detail.canEdit;
  const lines: Line[] = useMemo(() => [
    ...products.map(p => { const v = planning.productSupply[p.id] ?? { supply: "buy" as Supply, assignedTo: "shared" }; return { key: `product:${p.id}`, name: p.name, price: p.price, supply: v.supply, who: v.assignedTo, product: p, target: `product:${p.id}` }; }),
    ...furniture.filter(f => f.inventory && !f.built_in && !purchaseForPiece(f, products)).map(f => ({ key: `furniture:${f.id}`, name: f.label, price: f.cost ?? 0, supply: supplyFor(f), who: f.assigned_to ?? "shared", piece: f, target: `furniture:${f.id}` })),
  ], [products, furniture, planning.productSupply]);
  const known = (id: string) => people.some(p => p.id === id);
  const costs = assignedCosts(furniture, products, planning);
  const fromHome = lines.filter(l => l.supply === "owned").reduce((n, l) => n + l.price, 0);
  const unclaimed = Object.entries(costs).filter(([id]) => id === "shared" || !known(id)).reduce((n, [, v]) => n + v, 0);
  const segments = [...people.map(p => ({ id: p.id, label: `${p.name} buys`, value: costs[p.id] ?? 0, color: p.color })),
    { id: "shared", label: "Nobody yet", value: unclaimed, color: "" }, { id: "home", label: "From home", value: fromHome, color: "#B9B7C2" }];
  const total = segments.reduce((n, x) => n + x.value, 0);

  function assign(line: Line, patch: Partial<{ supply: Supply; assignedTo: string }>) {
    usePlannerStore.setState(st => assignOwnership(st.furniture ?? [], st.planning, products, line.product ? { productId: line.product.id } : { itemId: line.piece!.id }, patch));
  }
  const dupes = Object.entries(DUPLICATE_TYPES).map(([type, words]) => ({ type, words, items: furniture.filter(f => f.type === type) }))
    .filter(d => d.items.length > 1 && !kept.includes(d.items.map(f => f.id).sort().join()));
  const nameOf = (id: string) => people.find(p => p.id === id)?.name;
  const columns = [
    { id: "shared", title: "Nobody yet", note: "Shared and unclaimed", lines: lines.filter(l => l.supply === "buy" && (l.who === "shared" || !known(l.who))) },
    ...people.map(p => ({ id: p.id, title: p.id === userId ? "You're getting" : `${p.name}'s getting`, note: "", color: p.color, lines: lines.filter(l => l.supply === "buy" && l.who === p.id) })),
    { id: "home", title: "From home", note: "Already owned", lines: lines.filter(l => l.supply === "owned") },
    { id: "school", title: "School provides", note: "Check with housing", lines: lines.filter(l => l.supply === "school") },
  ].filter(c => c.lines.length || c.id === "shared" || people.some(p => p.id === c.id));
  const sum = (ls: Line[], id: string) => id === "home" || id === "school" ? 0 : ls.reduce((n, l) => n + l.price, 0);

  return <section className={s.bring} aria-labelledby="bring-title">
    <CollaborationOverlay surface="shopping" />
    <div className={s.bringTop}>
      <div className={s.bringIntro}>
        <h2 id="bring-title" className={s.pageTitle}><span>Who brings what,</span> <em>so nobody brings two fridges.</em></h2>
        <p>Claim it, bring it from home, or leave it shared until you agree. Totals update for everyone as you go.</p>
      </div>
      <div className={s.spend} aria-labelledby="spend-title">
        <div className={s.spendHead}><h3 id="spend-title">Where the {money(Math.round(total))} is coming from</h3><span>List prices · {lines.length} things · Room budget {money(budget)}</span></div>
        <div className={s.spendBar} role="img" aria-label={`Of ${money(total)}: ${segments.map(x => `${x.label} ${money(x.value)}`).join(", ")}`}>
          {total > 0 ? segments.filter(x => x.value > 0).map(x => <span key={x.id} data-shared={x.id === "shared"} style={{ flexGrow: x.value, background: x.color || undefined }} />) : <span data-empty="true" />}
        </div>
        <dl className={s.spendKey}>{segments.map(x => <div key={x.id}><dt><i data-shared={x.id === "shared"} style={{ background: x.color || undefined }} aria-hidden="true" />{x.id === userId ? "You buy" : x.label}</dt><dd>{money(Math.round(x.value * 100) / 100)}</dd></div>)}</dl>
      </div>
    </div>
    {dupes.map(d => {
      const owners = d.items.map(f => supplyFor(f) === "owned" ? `${nameOf(f.assigned_to ?? "") ?? "someone"} is bringing one from home` : `${nameOf(f.assigned_to ?? "") ? possessive(nameOf(f.assigned_to ?? "")!) + " list" : "the shared list"} has one${f.cost ? ` for ${money(f.cost)}` : ""}`);
      return <div key={d.type} className={s.dupe} role="alert">
        <span className={s.dupeBadge} aria-hidden="true">{d.items.length}×</span>
        <p><strong>{COUNT[d.items.length] ?? d.items.length} {d.words[1]}.</strong> {owners.slice(0, 2).join(", and ")}.</p>
        <button type="button" className={s.dupeShow} onClick={() => showOnPlan(d.items[d.items.length - 1].id)}>Show on the plan</button>
        <button type="button" className={s.dupeKeep} onClick={() => setKept(k => [...k, d.items.map(f => f.id).sort().join()])}>Keep both</button>
      </div>;
    })}
    <div className={s.board}>
      {columns.map(c => <section key={c.id} className={s.column} data-col={c.id === "shared" || c.id === "home" || c.id === "school" ? c.id : "person"} style={"color" in c && c.color ? { "--person": c.color } as React.CSSProperties : undefined} aria-label={c.title}>
        <header><span className={s.columnDot} aria-hidden="true" /><h3>{c.title}</h3><span className={s.columnTotal}>{c.id === "home" || c.id === "school" ? `${c.lines.length}` : money(sum(c.lines, c.id))}</span></header>
        {c.note && <p className={s.columnNote}>{c.note}</p>}
        {!c.lines.length && <p className={s.columnEmpty}>{c.id === "shared" ? "Everything's claimed." : "Nothing yet."}</p>}
        {c.lines.map(l => <article key={l.key} className={s.card} id={l.product ? `workspace-product-${l.product.id}` : undefined}>
          <div className={s.cardTop}>
            {l.product && <ProductImage src={l.product.image_url} />}
            <div><h4>{l.name}</h4><p className={s.cardPrice}>{l.supply === "buy" ? money(l.price) : <><span>$0</span>{l.price > 0 && <s>{money(l.price)}</s>}</>}</p></div>
          </div>
          <div className={s.cardControls}>
            <label><span className="ds-sr">Supply for {l.name}</span><select disabled={!canEdit} value={l.supply} onChange={e => assign(l, { supply: e.target.value as Supply })}><option value="buy">To buy</option><option value="owned">From home</option><option value="school">School provides</option></select></label>
            <label><span className="ds-sr">Who brings {l.name}</span><select disabled={!canEdit} value={known(l.who) ? l.who : "shared"} onChange={e => assign(l, { assignedTo: e.target.value })}><option value="shared">Shared</option>{people.map(p => <option key={p.id} value={p.id}>{p.id === userId ? `${p.name} (you)` : p.name}</option>)}</select></label>
          </div>
          <div className={s.cardActions}>
            {canEdit && c.id === "shared" && <button type="button" className={s.claim} onClick={() => assign(l, { assignedTo: userId, supply: "buy" })}>I&apos;ll get it</button>}
            {l.product && <a href={l.product.affiliate_url} target="_blank" rel="noopener noreferrer sponsored">View product<ArrowUpRight size={12} /></a>}
            <button type="button" className={s.noteBtn} onClick={() => commentOn(l.target)}><CommentIcon size={13} />Leave a note</button>
          </div>
        </article>)}
      </section>)}
    </div>
    {!lines.length && <p className={s.columnEmpty}>Your shopping list is ready for its first pick. Browse the product panel in the room plan.</p>}
    <p className={s.bringFoot}>Prices are estimates and can change at checkout. Dormscape may earn from qualifying purchases.</p>
  </section>;
}
