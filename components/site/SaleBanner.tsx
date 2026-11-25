"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CloseIcon } from "@/components/ds/Icons";
import { PLUS_SALE_PRICE_USD, PRO_SALE_PRICE_USD, SALE_BONUS_CREDITS } from "@/lib/plan";
import { SALE, SALE_BANNER_KEY } from "@/lib/sale";

/** My Room app screens keep their space; the planner and the studio don't use the site shell at all. */
const APP = /^\/(my-room|rooms?)(\/|$)/;

/**
 * The Black Friday strip at the top of site pages, above the floating nav, in
 * the page flow (it scrolls away; never pinned). It's in the static HTML and
 * shows only under <html data-sale> (app/ds.css). Closing it is remembered, and
 * the head script hides it before paint on later visits.
 */
export default function SaleBanner() {
  if (APP.test(usePathname() ?? "")) return null;
  return (
    <div className="ds-sale-banner" data-sale-show="" role="region" aria-label="Black Friday sale">
      <Link href="/pricing">
        <b>Black Friday</b>{" "}
        {`Plus $${PLUS_SALE_PRICE_USD.toFixed(2)}, Pro $${PRO_SALE_PRICE_USD.toFixed(2)}`}
        <i>{`, each with +${SALE_BONUS_CREDITS} bonus credits`}</i>
        {` · ends ${SALE.ends}`}{" "}
        <span>See pricing →</span>
      </Link>
      <button
        type="button"
        aria-label="Hide the Black Friday banner"
        onClick={() => {
          try {
            localStorage.setItem(SALE_BANNER_KEY, SALE.id);
          } catch {
            // storage blocked: hidden for this page only
          }
          document.documentElement.setAttribute("data-sale-banner", "off");
        }}
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
