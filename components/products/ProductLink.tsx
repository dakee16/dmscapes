"use client";

import type { ReactNode } from "react";
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

/**
 * The outbound Amazon link for one product (our affiliate URL from the
 * catalog). Logged-out shoppers go through sign-in first when the result
 * page's buy gate is mounted, and resume straight to Amazon.
 */
export default function ProductLink({
  product,
  className,
  children,
  label,
}: {
  product: Product;
  className?: string;
  children: ReactNode;
  /** Accessible name when the visible content is an icon or a price. */
  label?: string;
}) {
  const buyGate = useBuyGate();
  return (
    <a
      href={product.affiliate_url}
      target="_blank"
      rel="noopener sponsored"
      aria-label={label}
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        const proceed = () => {
          signalBuyIntent();
          logProductClick(product);
        };
        if (buyGate && buyGate.gate(product.affiliate_url, proceed)) {
          e.preventDefault();
          return;
        }
        proceed();
      }}
    >
      {children}
    </a>
  );
}
