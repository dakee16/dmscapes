"use client";

import { useEffect, useRef, useState } from "react";
import type { BedSize, Product, ProductCategory } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/catalog";
import { beddingAdvisory } from "@/lib/bedding";
import { usePlannerStore } from "@/lib/store";
import { track } from "@/lib/analytics";
import ProductCard from "./ProductCard";
import SwapModal from "./SwapModal";

/** Product categories whose swap should resize a furniture footprint on the canvas. */
const CATEGORY_TO_FURNITURE_TYPE: Partial<Record<ProductCategory, string>> = {
  rug: "rug",
  laundry_hamper: "laundry_hamper",
  trash_can: "trash_can",
  storage: "storage_bins",
  desk_lamp: "desk_lamp",
  mirror: "mirror",
};

export default function ProductPanel({
  products,
  bedSize,
}: {
  products: Product[];
  bedSize?: BedSize;
}) {
  const [swapTarget, setSwapTarget] = useState<Product | null>(null);
  const advisory = beddingAdvisory(bedSize);
  const swapProduct = usePlannerStore((s) => s.swapProduct);
  const resizeItem = usePlannerStore((s) => s.resizeItem);
  const furniture = usePlannerStore((s) => s.furniture);

  // Cross-highlight state shared with the canvas. Hover takes visual priority
  // over the pinned click-selection, without clearing it.
  const hoveredCategory = usePlannerStore((s) => s.hoveredCategory);
  const selectedCategory = usePlannerStore((s) => s.selectedCategory);
  const setHoveredCategory = usePlannerStore((s) => s.setHoveredCategory);
  const toggleSelectedCategory = usePlannerStore((s) => s.toggleSelectedCategory);
  const activeCategory = hoveredCategory ?? selectedCategory;

  // Bring the active tile into view when the canvas lights one up (no-op when
  // it's already visible, so hovering within the list doesn't jump the scroll).
  const tileRefs = useRef(new Map<ProductCategory, HTMLDivElement | null>());
  useEffect(() => {
    if (!activeCategory) return;
    tileRefs.current
      .get(activeCategory)
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [activeCategory]);

  function handlePick(next: Product) {
    if (!swapTarget) return;
    swapProduct(swapTarget.category, next.id);
    track("product_swapped", { old: swapTarget.id, new: next.id });

    // If the replacement has a real footprint, update matching canvas items.
    const type = CATEGORY_TO_FURNITURE_TYPE[next.category];
    if (type && next.width_ft && next.length_ft && furniture) {
      for (const f of furniture) {
        if (f.type === type) resizeItem(f.id, next.width_ft, next.length_ft);
      }
    }
    setSwapTarget(null);
  }

  if (products.length === 0) {
    return (
      <div className="rounded-xl border border-ink/10 bg-white p-6 text-center">
        <p className="text-sm text-ink-soft">
          No products found for this style and budget. Try nudging the budget slider.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {products.map((p) => {
        const isActive = activeCategory === p.category;
        return (
        <div
          key={p.id}
          ref={(el) => {
            tileRefs.current.set(p.category, el);
          }}
          onMouseEnter={() => setHoveredCategory(p.category)}
          onMouseLeave={() => setHoveredCategory(null)}
          onClick={() => toggleSelectedCategory(p.category)}
          className="cursor-pointer scroll-mt-2"
        >
          <p
            className={`mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] transition-colors ${
              isActive ? "text-cobalt" : "text-ink-soft"
            }`}
          >
            {CATEGORY_LABELS[p.category] ?? p.category}
          </p>
          <ProductCard product={p} onSwapClick={setSwapTarget} active={isActive} />
          {p.category === "bedding" && advisory && (
            <div
              className={`mt-1.5 flex gap-2 rounded-lg border px-3 py-2.5 text-xs leading-relaxed ${
                advisory.level === "warning"
                  ? "border-amber/40 bg-amber/10 text-ink"
                  : "border-ink/10 bg-paper text-ink-soft"
              }`}
              role="note"
            >
              <svg
                className={`mt-0.5 h-4 w-4 shrink-0 ${
                  advisory.level === "warning" ? "text-amber" : "text-ink-soft"
                }`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                aria-hidden="true"
              >
                <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>
                <span className="font-semibold">
                  {advisory.level === "warning" ? "Bed size: " : "Heads up: "}
                </span>
                {advisory.message}
              </span>
            </div>
          )}
        </div>
        );
      })}
      {swapTarget && (
        <SwapModal
          product={swapTarget}
          onPick={handlePick}
          onClose={() => setSwapTarget(null)}
        />
      )}
    </div>
  );
}
