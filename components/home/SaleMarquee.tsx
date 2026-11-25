import Link from "next/link";
import { PLUS_SALE_PRICE_USD, PRO_SALE_PRICE_USD, SALE_BONUS_CREDITS } from "@/lib/plan";
import { SALE } from "@/lib/sale";
import css from "./SaleMarquee.module.css";

const usd = (n: number) => `$${n.toFixed(2)}`;
const SENTENCE = `Black Friday: Plus ${usd(PLUS_SALE_PRICE_USD)} and Pro ${usd(PRO_SALE_PRICE_USD)}, each with ${SALE_BONUS_CREDITS} bonus credits. Ends ${SALE.ends}. See pricing.`;

/** One run of the ticker: BLACK FRIDAY · PLUS $1.99 · PRO $4.99 · +2 BONUS CREDITS · ENDS MON 11:59PM ET. */
function Run() {
  return (
    <span className={css.run}>
      <span className={css.flag}>Black Friday</span>
      <span className={css.big}>
        Plus <em className={css.yellow}>{usd(PLUS_SALE_PRICE_USD)}</em>
      </span>
      <span className={css.star}>✦</span>
      <span className={css.big}>
        Pro <em className={css.blue}>{usd(PRO_SALE_PRICE_USD)}</em>
      </span>
      <span className={css.bonus}>{`+${SALE_BONUS_CREDITS} bonus credits`}</span>
      <span className={css.ends}>{`Ends ${SALE.ends}`}</span>
      <span className={css.star}>✦</span>
    </span>
  );
}

/**
 * The homepage's Black Friday ticker, in the hero just under the floating nav (it
 * replaces the site strip there). Static HTML, shown only under <html data-sale>
 * (app/ds.css). CSS-only loop: two identical halves slide by -50%; both are
 * aria-hidden and screen readers get one sentence. Hover or focus pauses it;
 * reduced motion or the site's motion pause leaves one still run.
 */
export default function SaleMarquee({ className = "" }: { className?: string }) {
  return (
    <Link href="/pricing" className={`${css.marquee} ${className}`} data-sale-show="">
      <span className="ds-sr">{SENTENCE}</span>
      <span className={css.rail} aria-hidden="true">
        <span className={css.half}>
          <Run />
          <Run />
        </span>
        <span className={css.half} data-copy="">
          <Run />
          <Run />
        </span>
      </span>
    </Link>
  );
}
