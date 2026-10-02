"use client";

import type { Product } from "@/lib/types";
import { cartUrl } from "@/lib/catalog";
import { track } from "@/lib/analytics";
import { signalBuyIntent } from "@/lib/purchase-intent";
import { useBuyGate } from "@/lib/buy-gate";
import { UpRightIcon } from "@/components/studio-ui/icons";
import { dollars } from "@/components/studio-ui/list";

// "Buy all": one Amazon cart link for everything still to buy. Routed through
// the buy gate so logged-out shoppers sign in first (and resume straight to
// Amazon). Split out so it can call useBuyGate() inside the BuyGateProvider.
export default function BuyAllButton({
  products,
  total,
  className,
}: {
  products: Product[];
  total: number;
  className?: string;
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
      className={className}
      aria-label={`Buy all ${products.length} items on Amazon, ${dollars(total)}`}
    >
      <span>Buy all {products.length}</span>
      <small>{dollars(total)} on Amazon</small>
      <UpRightIcon size={14} />
    </a>
  );
}
