"use client";

import Modal from "@/components/site/Modal";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/types";
import { usePlannerStore } from "@/lib/store";
import { syncProductFurniture } from "@/lib/product-model";
import { placementIssues, studioSettings } from "@/lib/studio";
import { MiniPlan } from "@/components/studio/PlanningPanels";
import { furnitureCategory } from "@/lib/highlight";
import { alternativesOf } from "@/lib/catalog";

export default function SwapModal({
  product,
  onPick,
  onClose,
}: {
  product: Product;
  onPick: (next: Product) => void;
  onClose: () => void;
}) {
  const [preview,setPreview]=useState<Product|null>(null);
  const room=usePlannerStore(s=>s.room),furniture=usePlannerStore(s=>s.furniture);
  const nextItems=useMemo(()=>preview&&room&&furniture?syncProductFurniture(furniture,[preview],room):null,[preview,room,furniture]);
  const problems=nextItems&&room?placementIssues(nextItems,room,studioSettings(room.studio)).filter(i=>nextItems.find(f=>f.id===i.id&&furnitureCategory(f)===preview?.category)):[];
  const larger=preview&&((preview.width_ft??0)>(product.width_ft??Infinity)||(preview.length_ft??0)>(product.length_ft??Infinity));
  const alternatives = alternativesOf(product);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <Modal
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 p-4 sm:items-center"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Swap ${product.name}`}
    >
      <div
        className="snap-in w-full max-w-md rounded-2xl border border-ink/10 bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-cobalt">
              Swap product
            </p>
            <h2 className="mt-1 font-display text-lg font-bold leading-snug text-ink">
              {product.name}
            </h2>
            <p className="mt-0.5 font-mono text-sm text-ink-soft">
              currently ${product.price.toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-full p-1.5 text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {preview&&<div className="mt-4 border border-cobalt/25 bg-paper p-4"><h3 className="font-semibold">Preview: {preview.name}</h3><p className="mt-2 text-sm">{preview.width_ft&&preview.length_ft?`${preview.width_ft} × ${preview.length_ft} ft. Product-supplied dimensions; confirm the selected variant.`:"No complete product dimensions. The canvas uses an approximate footprint."}</p>{larger&&<p className="mt-2 text-sm font-semibold text-[#855515]">This replacement is larger. Check its footprint before applying.</p>}{nextItems&&room&&<MiniPlan room={room} items={nextItems} highlight={nextItems.find(f=>!f.inventory&&furnitureCategory(f)===preview.category)?.id}/>}<p className="text-xs text-ink-soft">{problems.length?`${problems.length} placement checks need attention.`:"No new placement warning detected for this category."} Product shape and model are approximate.</p><div className="mt-3 flex gap-3"><button className="bg-cobalt px-4 py-2 text-sm font-semibold text-white" onClick={()=>onPick(preview)}>Apply replacement</button><button className="border border-ink/20 px-4 py-2 text-sm" onClick={()=>setPreview(null)}>Cancel</button></div></div>}
        {alternatives.length === 0 ? (
          <p className="mt-5 rounded-xl border border-ink/10 bg-paper p-4 text-sm text-ink-soft">
            No alternatives for this item yet.
          </p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {alternatives.map((alt) => {
              const diff = alt.price - product.price;
              return (
                <li key={alt.id}>
                  <button
                    type="button"
                    onClick={() => setPreview(alt)}
                    className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-ink/10 bg-white p-2.5 text-left transition-colors hover:border-cobalt"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={alt.image_url}
                      alt={alt.name}
                      loading="lazy"
                      decoding="async"
                      className="h-14 w-14 shrink-0 rounded-lg border border-ink/5 bg-white object-contain"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="line-clamp-2 block text-sm font-medium leading-snug text-ink">
                        {alt.name}
                      </span>
                      <span className="mt-0.5 block text-xs text-ink-soft">
                        <span className="font-mono font-semibold text-ink">
                          ${alt.price.toFixed(2)}
                        </span>{" "}
                        · <span className="text-highlight">★</span> {alt.rating.toFixed(1)}
                      </span>
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-xs font-semibold ${
                        diff <= 0 ? "bg-[#e8f5ec] text-[#1e7a3c]" : "bg-highlight/40 text-ink"
                      }`}
                    >
                      {diff <= 0 ? "−" : "+"}${Math.abs(diff).toFixed(0)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Modal>
  );
}
