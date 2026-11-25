import type { ReactNode } from "react";
import {
  PLUS_INITIAL_CREDITS,
  PLUS_PRICE_USD,
  PLUS_SALE_PRICE_USD,
  PRO_INITIAL_CREDITS,
  PRO_PRICE_USD,
  PRO_SALE_PRICE_USD,
  SALE_BONUS_CREDITS,
} from "@/lib/plan";
import { SALE, SALE_OFFER } from "@/lib/sale";

// Static pages are built once, so every price is rendered both ways and
// <html data-sale> (set before paint by lib/sale.ts SALE_SCRIPT) shows one
// (app/ds.css). Server and client render the same markup: no hydration
// mismatch, no flash, and the switch happens on time without a deploy.

type Tier = "plus" | "pro";
const usd = (n: number) => `$${n.toFixed(2)}`;
const REGULAR: Record<Tier, number> = { plus: PLUS_PRICE_USD, pro: PRO_PRICE_USD };
const ON_SALE: Record<Tier, number> = { plus: PLUS_SALE_PRICE_USD, pro: PRO_SALE_PRICE_USD };
const BASE: Record<Tier, number> = { plus: PLUS_INITIAL_CREDITS, pro: PRO_INITIAL_CREDITS };

/** "3 plan credits" (`sale` false), or "5 plan credits (3 + 2 bonus)". */
export function creditsText(tier: Tier, sale: boolean): string {
  return sale
    ? `${SALE_OFFER[tier].credits} plan credits (${BASE[tier]} + ${SALE_BONUS_CREDITS} bonus)`
    : `${BASE[tier]} plan credits`;
}

/** `regular` outside the sale, `sale` inside it. */
export function SaleSwap({ regular, sale }: { regular: ReactNode; sale: ReactNode }) {
  return (
    <>
      <span data-sale-hide="">{regular}</span>
      <span data-sale-show="">{sale}</span>
    </>
  );
}

/** The Plus or Pro price: "$4.99", or "$1.99" during the sale. */
export function PlanPrice({ tier }: { tier: Tier }) {
  return <SaleSwap regular={usd(REGULAR[tier])} sale={usd(ON_SALE[tier])} />;
}

/** The allowance a card states: "3 plan credits", or "5 plan credits (3 + 2 bonus)" during the sale.
 *  `short` is for tags: "10 credits", or "12 credits". */
export function PlanCredits({ tier, short = false }: { tier: Tier; short?: boolean }) {
  return short
    ? <SaleSwap regular={`${BASE[tier]} credits`} sale={`${SALE_OFFER[tier].credits} credits`} />
    : <SaleSwap regular={creditsText(tier, false)} sale={creditsText(tier, true)} />;
}

/** Shown only during the sale, under a price: "regularly $4.99 · +2 bonus credits (5 total) · ends Mon 11:59pm ET". */
export function SaleNote({ tier, className = "" }: { tier: Tier; className?: string }) {
  return (
    <span className={`ds-sale-note ${className}`} data-sale-show="">
      <b>Black Friday</b>{" "}
      {`regularly ${usd(REGULAR[tier])} · +${SALE_BONUS_CREDITS} bonus credits (${SALE_OFFER[tier].credits} total) · ends ${SALE.ends}`}
    </span>
  );
}
