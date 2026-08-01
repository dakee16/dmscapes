"use client";

import type { Product } from "@/lib/types";
import { cartUrl } from "@/lib/catalog";
import { track } from "@/lib/analytics";
import { signalBuyIntent } from "@/lib/purchase-intent";
import { useBuyGate } from "@/lib/buy-gate";

// The prominent "Buy all" cart link above the product list. Same visual as
// before; now routed through the buy gate so logged-out shoppers sign in first
// (and resume straight to Amazon). Split out of the result page so it can call
// useBuyGate() from inside the BuyGateProvider subtree.
export default function BuyAllButton({
  products,
  total,
}: {
  products: Product[];
  total: number;
}) {
  const buyGate = useBuyGate();
  const url = cartUrl(products);
  const proceed = () => {
    signalBuyIntent();
    track("product_clicked", { product_id: "buy_all", price: total, category: "cart" });
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener sponsored"
      onClick={(e) => {
        if (buyGate && buyGate.gate(url, proceed)) {
          e.preventDefault();
          return;
        }
        proceed();
      }}
      className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-cobalt px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-cobalt-deep"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="9" cy="21" r="1" />
        <circle cx="20" cy="21" r="1" />
        <path
          d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      Buy all {products.length} items{" "}
      <span className="font-mono">(${total.toFixed(0)})</span>
    </a>
  );
}
