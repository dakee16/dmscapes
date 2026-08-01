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
  active = false,
}: {
  product: Product;
  onSwapClick?: (p: Product) => void;
  /** Cross-highlight: true when the matching canvas item is hovered/selected. */
  active?: boolean;
}) {
  // Present on the result page; null elsewhere (links stay ungated there).
  const buyGate = useBuyGate();
  return (
    <div
      className={`flex items-center gap-3 rounded-xl border bg-white p-2.5 transition-all ${
        active
          ? "border-cobalt bg-cobalt/[0.04] ring-2 ring-cobalt/25"
          : "border-ink/10"
      }`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={product.image_url}
        alt={product.name}
        loading="lazy"
        className="h-16 w-16 shrink-0 rounded-lg border border-ink/5 bg-white object-contain"
      />
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{product.name}</p>
        <p className="mt-1 flex items-baseline gap-2">
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
        {onSwapClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSwapClick(product);
            }}
            className="mt-1 cursor-pointer font-mono text-[11px] font-medium uppercase tracking-wide text-cobalt hover:text-cobalt-deep"
          >
            ⇄ Swap
          </button>
        )}
      </div>
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
        className="shrink-0 self-center rounded-full bg-cobalt px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-cobalt-deep"
      >
        Buy
      </a>
    </div>
  );
}
