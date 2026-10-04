"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { BedSize, Product } from "@/lib/types";
import { alternativesOf } from "@/lib/catalog";
import { beddingAdvisory } from "@/lib/bedding";
import { usePlannerStore } from "@/lib/store";
import { useStudioUI } from "@/components/studio-ui/StudioUI";
import { LIST_GROUPS, OWN_GROUP, dollars, pad2, price, productDetail, type ListEntry, type ListGroupKey } from "@/components/studio-ui/list";
import { ChevronDownIcon, ChevronRight, PlusIcon, SwapIcon, TrashIcon, UpRightIcon, AlertIcon } from "@/components/studio-ui/icons";
import BudgetTracker from "./BudgetTracker";
import BuyAllButton from "./BuyAllButton";
import ProductImage from "./ProductImage";
import ProductLink from "./ProductLink";
import SwapPanel from "./SwapPanel";
import s from "./ShoppingList.module.css";

type Filter = "all" | ListGroupKey;

/**
 * The shopping list beside the plan: the budget meter pinned on top, filter
 * chips, the cart grouped by category with subtotals, then the pieces that
 * aren't in the list yet. Numbers match the pins on the canvas, and hovering
 * or selecting a row lights its piece (and the other way round).
 *
 * On phones the same list is a bottom sheet: it peeks with the budget and the
 * selected piece, and pulls up to the whole list.
 */
export default function ShoppingList({
  total,
  budget,
  bedSize,
  available,
  onAdd,
  buying,
  buyingTotal,
  unplacedIds,
  onPlace,
  extras,
  ownership,
}: {
  total: number;
  budget: number;
  bedSize?: BedSize;
  /** Pieces that fit the style but aren't in the cart ("Add more"). */
  available: Product[];
  onAdd: (product: Product) => void;
  /** What "Buy all" sends to Amazon (excludes owned / school-provided). */
  buying: Product[];
  buyingTotal: number;
  unplacedIds: string[];
  onPlace: (id: string) => void;
  extras?: ReactNode;
  ownership?: ReactNode;
}) {
  const ui = useStudioUI();
  const entries = useMemo(() => ui?.entries ?? [], [ui?.entries]);
  const hoveredCategory = usePlannerStore((st) => st.hoveredCategory);
  const selectedCategory = usePlannerStore((st) => st.selectedCategory);
  const selectedItemId = usePlannerStore((st) => st.selectedItemId);
  const setHoveredCategory = usePlannerStore((st) => st.setHoveredCategory);
  const toggleSelectedCategory = usePlannerStore((st) => st.toggleSelectedCategory);
  const toggleSelectedItem = usePlannerStore((st) => st.toggleSelectedItem);
  const [filter, setFilter] = useState<Filter>("all");
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const rows = useRef(new Map<string, HTMLDivElement | null>());
  const addMoreRef = useRef<HTMLDivElement>(null);
  const advisory = beddingAdvisory(bedSize);
  const sheet = ui?.variant === "planner" ? ui.sheet : "full";

  const isSelected = (e: ListEntry) => (e.custom ? selectedItemId === e.product.id : selectedCategory === e.product.category && !selectedItemIdIsCustom(selectedItemId, entries));
  const isActive = (e: ListEntry) => isSelected(e) || (!e.custom && hoveredCategory === e.product.category);
  const selected = entries.find(isSelected);

  // Bring a row into view only when it's pinned (canvas click or a row), never on hover.
  useEffect(() => {
    if (!selected) return;
    rows.current.get(selected.product.id)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selected]);

  // "Add a piece" from the rail opens and reveals the Add more section.
  useEffect(() => {
    if (ui?.addMoreOpen) addMoreRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [ui?.addMoreOpen]);

  if (ui?.swapTarget) return <SwapPanel product={ui.swapTarget} total={total} budget={budget} />;

  const peekIndex = Math.max(0, selected ? entries.indexOf(selected) : 0);
  const peekIds = new Set(entries.slice(peekIndex, peekIndex + 2).map((e) => e.product.id));
  if (peekIds.size < 2 && entries[peekIndex - 1]) peekIds.add(entries[peekIndex - 1].product.id);

  const groups = [
    ...LIST_GROUPS.map((g) => ({ key: g.key, label: g.label, items: entries.filter((e) => e.group === g.key) })),
    { key: OWN_GROUP.key, label: OWN_GROUP.label, items: entries.filter((e) => e.group === "own") },
  ].filter((g) => g.items.length > 0);
  const shown = groups.filter((g) => filter === "all" || g.key === filter);

  function select(e: ListEntry) {
    if (e.custom) toggleSelectedItem(e.product.id, e.product.category);
    else toggleSelectedCategory(e.product.category);
  }
  function toggleGroup(key: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  function row(e: ListEntry) {
    const p = e.product;
    const active = isActive(e), chosen = isSelected(e);
    const canSwap = !e.custom && alternativesOf(p).length > 0;
    const unplaced = e.custom && unplacedIds.includes(p.id);
    return (
      <div
        key={p.id}
        ref={(el) => { rows.current.set(p.id, el); }}
        className={s.row}
        data-active={active || undefined}
        data-selected={chosen || undefined}
        data-peek={peekIds.has(p.id) || undefined}
        onPointerEnter={(ev) => { if (!e.custom && ev.pointerType === "mouse") setHoveredCategory(p.category); }}
        onPointerLeave={(ev) => { if (!e.custom && ev.pointerType === "mouse") setHoveredCategory(null); }}
        onClick={() => select(e)}
      >
        <span className={s.num} aria-hidden="true">{pad2(e.number)}</span>
        <span className={s.thumb} aria-hidden="true"><ProductImage src={p.image_url} alt="" /></span>
        <span className={s.info}>
          <button type="button" className={s.name} aria-pressed={chosen}
            aria-label={`${pad2(e.number)}. ${p.name}, ${price(p.price)}${chosen ? ", selected" : ""}`}
            onClick={(ev) => { ev.stopPropagation(); select(e); }}>
            {p.name}
          </button>
          <span className={s.detail}>{unplaced ? "Not on the plan yet" : productDetail(p)}</span>
        </span>
        <span className={s.price}>{price(p.price)}</span>
        <span className={s.actions}>
          <ProductLink product={p} className={s.iconBtn} label={`View ${p.name} on Amazon`}><UpRightIcon size={15} /></ProductLink>
          {canSwap && (
            <button type="button" className={`${s.iconBtn} ${s.swapBtn}`} aria-label={`Swap ${p.name}`} title="Swap"
              onClick={(ev) => { ev.stopPropagation(); ui?.openSwap(p); }}>
              <SwapIcon size={15} />
            </button>
          )}
        </span>
        {chosen && (
          <div className={s.more} onClick={(ev) => ev.stopPropagation()}>
            <span className={s.rating}>
              <span aria-hidden="true">★</span> {p.rating.toFixed(1)} · {p.review_count.toLocaleString()} reviews
            </span>
            <span className={s.moreActions}>
              {unplaced && <button type="button" className={s.textBtn} onClick={() => onPlace(p.id)}>Place on the plan</button>}
              {canSwap && <button type="button" className={`${s.textBtn} ${s.moreSwap}`} onClick={() => ui?.openSwap(p)}><SwapIcon size={13} /> Swap</button>}
              <ProductLink product={p} className={s.textBtn}>Buy on Amazon <UpRightIcon size={12} /></ProductLink>
              <button type="button" className={`${s.textBtn} ${s.danger}`} onClick={() => ui?.remove(e)} aria-label={`Remove ${p.name} from your list`}>
                <TrashIcon size={13} /> Remove
              </button>
            </span>
          </div>
        )}
        {p.category === "bedding" && advisory && (
          <p className={s.advisory} data-level={advisory.level} role="note">
            <AlertIcon size={14} />
            <span><strong>{advisory.level === "warning" ? "Bed size: " : "Heads up: "}</strong>{advisory.message}</span>
          </p>
        )}
      </div>
    );
  }

  const addMoreOpen = ui?.addMoreOpen ?? false;
  const ownLocked = ui?.ownLocked ?? false;

  return (
    <section className={s.list} data-sheet={sheet} data-variant={ui?.variant} aria-label="Shopping list">
      <header className={s.head}>
        <div className={s.sheetTitle}>
          <h2>Shopping list</h2>
          {ui?.variant === "planner" && (
            <button type="button" className={s.collapse} aria-label="Collapse the shopping list" onClick={() => ui.setSheet("peek")}>
              <ChevronDownIcon size={20} strokeWidth={2.6} />
            </button>
          )}
        </div>
        <div className={s.titleRow}>
          <h2 className={s.eyebrow}>Shopping list</h2>
          <span className={s.count}>{entries.length} {entries.length === 1 ? "piece" : "pieces"}</span>
        </div>
        <BudgetTracker total={total} budget={budget} />
        <div className={s.sheetMeter}><BudgetTracker total={total} budget={budget} pieces={entries.length} size="md" /></div>
        <div className={s.peekRow}>
          <span className={s.eyebrow}>Shopping list · {entries.length}</span>
          <button type="button" className={s.seeAll} onClick={() => ui?.setSheet("full")}>See all</button>
        </div>
      </header>

      {extras && <div className={s.extras}>{extras}</div>}
      {ownership && <div className={s.extras}>{ownership}</div>}

      {groups.length > 1 && (
        <div className={s.chips} role="group" aria-label="Filter the list">
          <button type="button" aria-pressed={filter === "all"} onClick={() => setFilter("all")}>All {entries.length}</button>
          {groups.map((g) => (
            <button type="button" key={g.key} aria-pressed={filter === g.key} onClick={() => setFilter(filter === g.key ? "all" : g.key)}>
              {g.label}
            </button>
          ))}
        </div>
      )}

      <div className={s.scroll}>
        {entries.length === 0 && (
          <div className={s.empty}>
            <p>Your list is empty. Add pieces from <strong>Add more</strong> below to build your room.</p>
          </div>
        )}
        {shown.map((g) => {
          const open = !collapsed.has(g.key);
          const subtotal = g.items.reduce((sum, e) => sum + e.product.price, 0);
          return (
            <div key={g.key} className={s.group}>
              <button type="button" className={s.groupHead} aria-expanded={open} onClick={() => toggleGroup(g.key)}>
                <span className={s.groupLabel}>
                  {open ? <ChevronDownIcon size={12} /> : <ChevronRight size={12} />}
                  {g.label} · {g.items.length}
                </span>
                <span className={s.subtotal}>{dollars(subtotal)}</span>
              </button>
              {open && <div className={s.rows}>{g.items.map(row)}</div>}
            </div>
          );
        })}

        <div ref={addMoreRef} className={s.addMore} data-open={addMoreOpen || undefined}>
          <button type="button" className={s.groupHead} aria-expanded={addMoreOpen} onClick={() => ui?.setAddMoreOpen(!addMoreOpen)}>
            <span className={s.groupLabel}>
              {addMoreOpen ? <ChevronDownIcon size={12} /> : <ChevronRight size={12} />}
              Add more · {available.length}
            </span>
            <span className={s.addMoreHint}>Not in your list yet</span>
          </button>
          {addMoreOpen && (
            available.length === 0 ? (
              <p className={s.note}>Everything that fits your budget is already in your list. Remove a piece to free up room for others.</p>
            ) : (
              <ul className={s.catalog}>
                {available.map((p) => (
                  <li key={p.id} className={s.catalogRow}>
                    <span className={s.thumb} aria-hidden="true"><ProductImage src={p.image_url} alt="" /></span>
                    <span className={s.info}>
                      <span className={s.catalogName}>{p.name}</span>
                      <span className={s.detail}>{productDetail(p)}</span>
                    </span>
                    <span className={s.price}>{price(p.price)}</span>
                    <button type="button" className={`${s.iconBtn} ${s.addBtn}`} aria-label={`Add ${p.name} to your list`} title="Add to list" onClick={() => onAdd(p)}>
                      <PlusIcon size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )
          )}
        </div>
      </div>

      <footer className={s.foot}>
        <button type="button" className={s.addOwn} onClick={() => ui?.addOwn()}
          aria-label={ownLocked ? "Add your own product (Plus feature)" : "Add your own product"}>
          <PlusIcon size={15} strokeWidth={2.6} />Add your own{ownLocked && <span className={s.plusTag}>Plus</span>}
        </button>
        {buying.length > 0 && <BuyAllButton products={buying} total={buyingTotal} className={s.buyAll} />}
      </footer>
    </section>
  );
}

/** A canvas pin on a custom item sets selectedItemId; catalog rows key off the category. */
function selectedItemIdIsCustom(id: string | null, entries: ListEntry[]) {
  return !!id && entries.some((e) => e.custom && e.product.id === id);
}
