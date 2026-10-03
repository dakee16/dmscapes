import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import { ArrowRight, ArrowUpRight } from "@/components/ds/Icons";
import css from "./SharePage.module.css";
import OpenInPlanner from "./OpenInPlanner";
import RoomReview from "@/components/studio/RoomReview";
import { DEFAULT_PLANNING, shoppingProducts } from "@/lib/planning";
import { visibleFurniture } from "@/lib/studio";
import SharedRoomStudio from "@/components/studio/SharedRoomStudio";
import EstimatedDimsNote from "./EstimatedDimsNote";
import type { SaveRoomRequest } from "@/lib/api-types";
import { CATEGORY_LABELS, CATEGORY_ORDER, cartUrl, productById, totalFor } from "@/lib/catalog";
import { formatRoomType } from "@/lib/format";
import { getSchool } from "@/lib/schools";
import { styleById } from "@/lib/styles";
import type { Product } from "@/lib/types";

/** The public read-only share page body for one saved design (/room/[id]). */
export default function SharedRoomView({ id, room }: { id: string; room: SaveRoomRequest }) {
  const dims = room.room_dimensions;
  const school = room.college_id ? getSchool(room.college_id) : undefined;
  const style = styleById(room.style);
  const products = dims.editor?.cartProducts ?? CATEGORY_ORDER.map((cat) => {
    const pid = room.selected_products?.[cat];
    return pid ? productById(pid) : undefined;
  }).filter((p): p is Product => Boolean(p));
  const planning=dims.editor?.planning??DEFAULT_PLANNING;
  const buying=shoppingProducts(products,planning);
  const total = totalFor(buying);

  const roomInput = {type:dims.room_type,occupants:dims.occupants??1,lengthFt:dims.length_ft,widthFt:dims.width_ft,bedSize:dims.bed_size??"twin_xl" as const,source:(dims.outline?"drawn":"manual") as "drawn"|"manual",outline:dims.outline??null,studio:dims.studio};
  return (
    <PageShell className={css.page}>
      <section className={`ds-wrap ${css.head}`}>
        <div>
          <p className="ds-eyebrow">A room planned with Dormscape</p>
          <h1 className={css.title}>
            {dims.editor?.customVibe || style.name} <em>room.</em>
          </h1>
          <p className={css.meta}>
            {school ? `${school.name} · ` : ""}
            {formatRoomType(dims.room_type)}
            <span aria-hidden="true"> · </span>
            <span className={css.nowrap}>{dims.length_ft} × {dims.width_ft} ft</span>
          </p>
          {dims.estimated && <EstimatedDimsNote className={css.estimated} />}
        </div>
        {/* CTA first: this page exists to convert viewers */}
        <aside className={css.cta} aria-label="Plan your own room">
          <p className={css.ctaTitle}>Design your own room. <em>It&rsquo;s free.</em></p>
          <p className={css.ctaBody}>Your exact dorm, your style, your budget. Two minutes.</p>
          <Link href="/plan" className="ds-btn ds-btn--ink-yellow ds-btn--sm">Start planning<ArrowRight size={16} /></Link>
        </aside>
      </section>

      <section className={`ds-wrap ${css.grid}`} aria-label="The room and its shopping list">
        <div className={css.room}>
          <SharedRoomStudio room={roomInput} items={room.furniture_positions} style={room.style} products={products} editor={dims.editor}/>
          <OpenInPlanner
            seed={{
              college_id: room.college_id,
              dorm_id: room.dorm_id,
              length_ft: dims.length_ft,
              width_ft: dims.width_ft,
              room_type: dims.room_type,
              occupants: dims.occupants ?? null,
              bed_size: dims.bed_size,
              estimated: dims.estimated ?? false,
              style: room.style,
              budget: room.budget,
              template_id: room.template_id,
              furniture: room.furniture_positions,
              products: room.selected_products ?? null,
              outline: dims.outline ?? null,
              studio: dims.studio,
              editor: dims.editor,
            }}
            className={css.openPlanner}
          >
            Open this design in the planner<ArrowUpRight size={15} />
          </OpenInPlanner>
        </div>

        <div className={css.list}>
          <div className={css.listHead}>
            <h2>The shopping list</h2>
            <p className={css.total}>${total.toFixed(2)}</p>
          </div>
          {buying.length > 0 && (
            <a href={cartUrl(buying)} target="_blank" rel="noopener sponsored" className={css.buyAll}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="9" cy="21" r="1" />
                <circle cx="20" cy="21" r="1" />
                <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Buy all {buying.length} on Amazon
            </a>
          )}
          <ul className={css.items}>
            {buying.map((p) => (
              <li key={p.id}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.image_url} alt={p.name} loading="lazy" decoding="async" />
                <div>
                  <p className={css.itemName}>{p.name}</p>
                  <p className={css.itemMeta}>{CATEGORY_LABELS[p.category]} · ${p.price.toFixed(2)}</p>
                </div>
                <a href={p.affiliate_url} target="_blank" rel="noopener noreferrer sponsored" aria-label={`Buy ${p.name}`}>Buy</a>
              </li>
            ))}
          </ul>
          {buying.length === 0 && (
            <p className={css.empty}>
              No purchases in this list. School-provided and already-owned products stay out of the total.
            </p>
          )}
          <p className={css.fine}>Prices can change at checkout. Dormscape may earn from qualifying purchases.</p>
        </div>
      </section>
      <div className="ds-wrap">
        <RoomReview id={id} planning={planning} products={products} items={visibleFurniture(room.furniture_positions,dims.editor?.hiddenItemIds??[],dims.editor?.excluded??[])} room={roomInput}/>
      </div>
    </PageShell>
  );
}
