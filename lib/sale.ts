// Black Friday 2026 (qa-tmp/plans/holiday-and-home.md, owner decisions A–C):
// Plus $1.99 and Pro $4.99, each with 2 bonus credits, from Thu Nov 26 12:00am
// to Mon Nov 30 11:59pm Eastern. Checkout decides by the server's clock; pages
// show it under <html data-sale="bf2026">, which SALE_SCRIPT sets before paint.
import {
  PLUS_INITIAL_CREDITS,
  PLUS_PRICE_CENTS,
  PLUS_SALE_PRICE_CENTS,
  PRO_INITIAL_CREDITS,
  PRO_PRICE_CENTS,
  PRO_SALE_PRICE_CENTS,
  SALE_BONUS_CREDITS,
} from "@/lib/plan";

export const SALE = {
  id: "bf2026",
  start: "2026-11-26T00:00:00-05:00",
  end: "2026-12-01T00:00:00-05:00",
  ends: "Mon 11:59pm ET",
} as const;

const START_MS = Date.parse(SALE.start);
const END_MS = Date.parse(SALE.end);

/** Kill switch: NEXT_PUBLIC_SALE=off turns the sale off, in checkout and on every page, on the next deploy. */
export const SALE_ENABLED = process.env.NEXT_PUBLIC_SALE !== "off";

/** Inside the window, start included and end excluded. Both are absolute instants, so any clock agrees. */
export function isSale(now: number = Date.now()): boolean {
  return SALE_ENABLED && now >= START_MS && now < END_MS;
}

/** The sale offer: the sale price, and the usual allowance plus the bonus. */
export const SALE_OFFER = {
  plus: { cents: PLUS_SALE_PRICE_CENTS, credits: PLUS_INITIAL_CREDITS + SALE_BONUS_CREDITS },
  pro: { cents: PRO_SALE_PRICE_CENTS, credits: PRO_INITIAL_CREDITS + SALE_BONUS_CREDITS },
} as const;
const REGULAR = {
  plus: { cents: PLUS_PRICE_CENTS, credits: PLUS_INITIAL_CREDITS },
  pro: { cents: PRO_PRICE_CENTS, credits: PRO_INITIAL_CREDITS },
} as const;

/** What a Plus or Pro checkout started at `now` charges and grants. */
export function salePlan(type: "plus" | "pro", now: number = Date.now()): { cents: number; credits: number; sale: boolean } {
  const sale = isSale(now);
  return { ...(sale ? SALE_OFFER : REGULAR)[type], sale };
}

/** sessionStorage key for the ?sale=on (or ?sale=off) preview flag. */
const PREVIEW_KEY = "dormscape-sale";
/** localStorage key the banner's close button sets (components/site/SaleBanner). */
export const SALE_BANNER_KEY = "dormscape-sale-banner";

/**
 * Runs in <head> before first paint: static pages are built once, so only the
 * browser can tell when the window opens and closes. ?sale=on forces the sale
 * display on and ?sale=off forces it off, for the rest of the tab session; the
 * preview never changes what checkout charges. A dismissed banner stays hidden.
 */
export const SALE_SCRIPT = `(function(){var t=Date.now(),on=t>=${START_MS}&&t<${END_MS},d=document.documentElement;try{var s=sessionStorage,m=/[?&]sale=(on|off)\\b/.exec(location.search);if(m)s.setItem("${PREVIEW_KEY}",m[1]);var f=s.getItem("${PREVIEW_KEY}");if(f)on=f==="on"}catch(e){}if(!on)return;d.setAttribute("data-sale","${SALE.id}");try{if(localStorage.getItem("${SALE_BANNER_KEY}")==="${SALE.id}")d.setAttribute("data-sale-banner","off")}catch(e){}})()`;
