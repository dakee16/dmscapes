"use client";

import type { Product } from "@/lib/types";
import { track, sessionId } from "@/lib/analytics";
import { signalBuyIntent } from "@/lib/purchase-intent";
import { useBuyGate } from "@/lib/buy-gate";
import type { ProductClickRequest } from "@/lib/api-types";

export function logProductClick(p: Product): void {
  track("product_clicked", { product_id: p.id, price: p.price, category: p.category });
  const body: ProductClickRequest = {
    session_id: sessionId(),
    product_id: p.id,
    product_price: p.price,
    affiliate_url: p.affiliate_url,
  };
  // Fire-and-forget; never block the outbound click on this.
  fetch("/api/product-clicks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true,
  }).catch(() => {});
}

export default function ProductCard({
  product,
  onSwapClick,
  onRemove,
  active = false,
}: {
  product: Product;
  onSwapClick?: (p: Product) => void;
  /** When set, shows a trash control that moves this item to "Things to add". */
  onRemove?: () => void;
  /** Cross-highlight: true when the matching canvas item is hovered/selected. */
  active?: boolean;
}) {
  // Present on the result page; null elsewhere (links stay ungated there).
  const buyGate = useBuyGate();
  const hasActions = Boolean(onSwapClick || onRemove);
  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-xl border transition-all ${
        active ? "border-cobalt bg-cobalt/[0.04] ring-2 ring-cobalt/25" : "border-ink/10 bg-white"
      }`}
    >
      {/* Tile content (image + name + price + rating + buy). Narrower now so the
          action column can own the right edge, full height. */}
      <div className="flex min-w-0 flex-1 items-center gap-3 p-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image_url}
          alt={product.name}
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-lg border border-ink/5 bg-white object-contain"
        />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{product.name}</p>
          <p className="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="font-mono text-sm font-semibold text-ink">
              ${product.price.toFixed(2)}
            </span>
            <span className="text-xs text-ink-soft">
              <span className="text-highlight" aria-hidden>
                ★
              </span>{" "}
              {product.rating.toFixed(1)} ({product.review_count.toLocaleString()})
            </span>
          </p>
          <a
            href={product.affiliate_url}
            target="_blank"
            rel="noopener sponsored"
            onClick={(e) => {
              e.stopPropagation();
              const proceed = () => {
                signalBuyIntent();
                logProductClick(product);
              };
              // Logged out: intercept, send them through sign-in, resume after.
              if (buyGate && buyGate.gate(product.affiliate_url, proceed)) {
                e.preventDefault();
                return;
              }
              proceed();
            }}
            className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] font-semibold uppercase tracking-wide text-cobalt hover:text-cobalt-deep"
          >
            Buy on Amazon
            <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M7 17 17 7M9 7h8v8" />
            </svg>
          </a>
        </div>
      </div>

      {/* Right-edge action column, full tile height: swap (top) + trash (bottom). */}
      {hasActions && (
        <div className="flex w-12 shrink-0 flex-col border-l border-ink/10">
          {onSwapClick && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSwapClick(product);
              }}
              aria-label={`Swap ${product.name} for another`}
              title="Swap"
              className={`flex flex-1 items-center justify-center bg-cobalt/10 text-cobalt transition-colors hover:bg-cobalt/20 ${
                onRemove ? "border-b border-ink/10" : ""
              }`}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 4 3 8l4 4" />
                <path d="M3 8h13a4 4 0 0 1 4 4" />
                <path d="m17 20 4-4-4-4" />
                <path d="M21 16H8a4 4 0 0 1-4-4" />
              </svg>
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              aria-label={`Remove ${product.name} from your list`}
              title="Remove"
              className="flex flex-1 items-center justify-center bg-[#c2321e] text-white transition-colors hover:bg-[#a52a19]"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
