"use client";

import { useState } from "react";
import type { Product, ProductCategory } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/catalog";
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

export default function ProductPanel({ products }: { products: Product[] }) {
  const [swapTarget, setSwapTarget] = useState<Product | null>(null);
  const swapProduct = usePlannerStore((s) => s.swapProduct);
  const resizeItem = usePlannerStore((s) => s.resizeItem);
  const furniture = usePlannerStore((s) => s.furniture);

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
          No products found for this style and budget — try nudging the budget slider.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {products.map((p) => (
        <div key={p.id}>
          <p className="mb-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-soft">
            {CATEGORY_LABELS[p.category] ?? p.category}
          </p>
          <ProductCard product={p} onSwapClick={setSwapTarget} />
        </div>
      ))}
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
