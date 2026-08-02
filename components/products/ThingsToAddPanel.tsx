"use client";

import type { Product } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/catalog";

/**
 * Companion to the cart: pieces that fit the current style but aren't in the
 * active list (trimmed from the budget-aware auto-list, or removed by hand).
 * Each tile mirrors the cart card styling with a single "+" to move it back in.
 * Adding runs through the result page's budget check (which may confirm first).
 */
export default function ThingsToAddPanel({
  items,
  onAdd,
}: {
  items: Product[];
  onAdd: (product: Product) => void;
}) {
  return (
    <section className="rounded-2xl border border-ink/10 bg-paper/70 p-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-cobalt">
          Catalog
        </p>
        {items.length > 0 && (
          <span className="font-mono text-[11px] font-medium text-ink-soft">
            {items.length} {items.length === 1 ? "piece" : "pieces"}
          </span>
        )}
      </div>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        Pieces that fit this style but aren&apos;t in your list yet.
      </p>

      {items.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-ink/20 bg-white/60 px-4 py-5 text-center">
          <p className="text-sm text-ink-soft">
            Everything that fits your budget is already in your list. Remove a
            piece to free up room for others.
          </p>
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {items.map((p) => (
            <li key={p.id}>
              <div className="flex items-center gap-3 rounded-xl border border-ink/10 bg-white p-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={p.image_url}
                  alt={p.name}
                  loading="lazy"
                  className="h-14 w-14 shrink-0 rounded-lg border border-ink/5 bg-white object-contain"
                />
                <div className="min-w-0 flex-1">
                  <p className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink-soft">
                    {CATEGORY_LABELS[p.category] ?? p.category}
                  </p>
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">
                    {p.name}
                  </p>
                  <p className="mt-0.5 flex items-baseline gap-2">
                    <span className="font-mono text-sm font-semibold text-ink">
                      ${p.price.toFixed(2)}
                    </span>
                    <span className="text-xs text-ink-soft">
                      <span className="text-highlight" aria-hidden>
                        ★
                      </span>{" "}
                      {p.rating.toFixed(1)} ({p.review_count.toLocaleString()})
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAdd(p)}
                  aria-label={`Add ${p.name} to your list`}
                  className="flex shrink-0 items-center gap-1 self-center rounded-full border border-cobalt/30 bg-cobalt/[0.06] px-3 py-2 text-xs font-semibold text-cobalt transition-colors hover:bg-cobalt/12"
                >
                  <span aria-hidden="true" className="text-sm leading-none">
                    +
                  </span>
                  Add
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
