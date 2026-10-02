"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/types";
import { alternativesOf } from "@/lib/catalog";
import { styleById } from "@/lib/styles";
import { usePlannerStore } from "@/lib/store";
import { syncProductFurniture } from "@/lib/product-model";
import { placementIssues, studioSettings } from "@/lib/studio";
import { useStudioUI } from "@/components/studio-ui/StudioUI";
import { categoryNoun, dollars, price, sizeLabel } from "@/components/studio-ui/list";
import { CheckIcon, ChevronLeft, PlusIcon } from "@/components/studio-ui/icons";
import ProductImage from "./ProductImage";
import s from "./ShoppingList.module.css";

type FilterKey = "fits" | "same" | "under" | "style";

/**
 * Swap one piece for an alternative from the catalog. Each option shows its
 * size and what it does to the budget; hovering (or focusing) one ghosts its
 * footprint onto the plan before anything changes. "Use this" applies it.
 */
export default function SwapPanel({ product, total, budget }: { product: Product; total: number; budget: number }) {
  const ui = useStudioUI();
  const room = usePlannerStore((st) => st.room);
  const furniture = usePlannerStore((st) => st.furniture);
  const style = usePlannerStore((st) => st.style);
  const [filters, setFilters] = useState<Set<FilterKey>>(() => new Set(["fits"]));
  const [preview, setPreview] = useState<Product | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const noun = categoryNoun(product.category);
  const styleName = style && style !== "custom" ? styleById(style).name : null;

  const options = useMemo(() => alternativesOf(product).map((alt) => {
    let fits = true;
    if (room && furniture) {
      const next = syncProductFurniture(furniture, [alt], room);
      const changed = new Set(next.filter((f, i) => f !== furniture[i]).map((f) => f.id));
      fits = !placementIssues(next, room, studioSettings(room.studio)).some((issue) => changed.has(issue.id));
    }
    const area = (p: Product) => (p.width_ft && p.length_ft ? p.width_ft * p.length_ft : null);
    const a = area(alt), b = area(product);
    const same = a !== null && b !== null && Math.abs(a - b) < 0.01;
    const fit = a === null ? "size not listed" : b === null ? "new size" : same ? "same spot" : a < b ? "more walkway" : "takes more floor";
    return { alt, fits, same, fit, delta: alt.price - product.price };
  }), [product, room, furniture]);

  const visible = options.filter((o) =>
    (!filters.has("fits") || o.fits) &&
    (!filters.has("same") || o.same) &&
    (!filters.has("under") || o.alt.price < product.price) &&
    (!filters.has("style") || !style || o.alt.style_tags.includes(style)));

  // Stable callbacks from the provider (PlanResult memoizes them).
  const closeSwap = ui?.closeSwap, previewSwap = ui?.previewSwap;
  // Focus the heading on open; Escape goes back to the list.
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") closeSwap?.(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeSwap, product.id]);
  // The ghost lives only while this sheet is open.
  useEffect(() => () => previewSwap?.(null), [previewSwap]);

  function show(alt: Product | null) {
    setPreview(alt);
    ui?.previewSwap(alt);
  }
  function toggle(key: FilterKey) {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }
  const after = preview ? total + preview.price - product.price : total;
  const left = budget - after;
  const size = sizeLabel(product.width_ft, product.length_ft);

  return (
    <section className={`${s.list} ${s.swap}`} data-sheet="full" aria-labelledby="swap-title">
      <header className={s.swapHead}>
        <button type="button" className={s.back} onClick={() => ui?.closeSwap()}>
          <ChevronLeft size={16} />Shopping list
        </button>
        <h2 id="swap-title" ref={heading} tabIndex={-1} className={s.swapTitle}>
          <span>Swap the {noun}</span> <em>for one that fits.</em>
        </h2>
        <p className={s.now}>Now: {product.name}{size ? ` · ${size}` : ""} · {price(product.price)}</p>
        <div className={s.ifSwap} role="status" aria-live="polite">
          <span>
            <small>{preview ? "If you swap" : "Your list now"}</small>
            <strong>{dollars(after)} of {dollars(budget)}</strong>
          </span>
          <b data-over={left < 0 || undefined}>{left < 0 ? `${dollars(-left)} over` : `${dollars(left)} to spare`}</b>
        </div>
      </header>
      <div className={s.chips} role="group" aria-label="Filter alternatives">
        <button type="button" aria-pressed={filters.has("fits")} onClick={() => toggle("fits")}>
          {filters.has("fits") && <CheckIcon size={12} />}Fits this spot
        </button>
        <button type="button" aria-pressed={filters.has("same")} onClick={() => toggle("same")}>
          {filters.has("same") && <CheckIcon size={12} />}Same size
        </button>
        <button type="button" aria-pressed={filters.has("under")} onClick={() => toggle("under")}>
          {filters.has("under") && <CheckIcon size={12} />}Under {price(product.price)}
        </button>
        {styleName && (
          <button type="button" aria-pressed={filters.has("style")} onClick={() => toggle("style")}>
            {filters.has("style") && <CheckIcon size={12} />}{styleName}
          </button>
        )}
      </div>
      <div className={s.scroll}>
        {options.length === 0 ? (
          <p className={s.note}>No alternatives for this item yet.</p>
        ) : visible.length === 0 ? (
          <p className={s.note}>Nothing matches these filters. Turn one off to see more of the {options.length} alternatives.</p>
        ) : (
          <ul className={s.options} aria-label="Alternatives">
            {visible.map(({ alt, fit, delta }) => {
              const spare = budget - (total + delta);
              const chosen = preview?.id === alt.id;
              return (
                <li key={alt.id} className={s.option} data-preview={chosen || undefined}
                  onMouseEnter={() => show(alt)} onMouseLeave={() => show(null)}
                  onFocus={() => show(alt)}>
                  <span className={s.optionThumb} aria-hidden="true"><ProductImage src={alt.image_url} alt="" /></span>
                  <span className={s.optionInfo}>
                    <button type="button" className={s.optionName} aria-pressed={chosen} onClick={() => show(chosen ? null : alt)}
                      aria-label={`Preview ${alt.name} on the plan`}>{alt.name}</button>
                    <span className={s.detail}>{sizeLabel(alt.width_ft, alt.length_ft) ?? "Size not listed"} · {fit}</span>
                    <span className={s.delta} data-up={delta > 0 || undefined}>
                      {delta > 0 ? "+" : delta < 0 ? "−" : "±"}{dollars(Math.abs(delta))} · {spare < 0 ? `${dollars(-spare)} over` : `${dollars(spare)} to spare`}
                    </span>
                  </span>
                  <span className={s.optionSide}>
                    <span className={s.price}>{price(alt.price)}</span>
                    <button type="button" className={s.useThis} data-primary={chosen || undefined}
                      aria-label={`Use ${alt.name} instead`} onClick={() => ui?.applySwap(alt)}>Use this</button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
        <p className={s.note}>Sizes come from the seller&apos;s listing. Check the variant you pick before buying.</p>
      </div>
      <footer className={s.foot}>
        <button type="button" className={s.addOwn} onClick={() => ui?.addOwn()}
          aria-label={ui?.ownLocked ? "Add your own product (Plus feature)" : "Add your own product"}>
          <PlusIcon size={15} strokeWidth={2.6} />Add your own product{ui?.ownLocked && <span className={s.plusTag}>Plus</span>}
        </button>
        <button type="button" className={s.keep} onClick={() => ui?.closeSwap()}>Keep the current {noun}</button>
      </footer>
    </section>
  );
}
