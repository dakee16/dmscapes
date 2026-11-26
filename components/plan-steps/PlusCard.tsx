"use client";

import { STYLES } from "@/lib/styles";
import { PLUS_INITIAL_CREDITS, PLUS_PRICE_USD } from "@/lib/plan";
import { SALE_OFFER } from "@/lib/sale";
import { PlanCredits, PlanPrice, SaleNote, SaleSwap } from "@/components/site/Sale";
import { useUpgrade } from "@/lib/upgrade-context";
import { useHallFinderOn } from "@/components/hall-finder/useHallFinderOn";
import css from "./Vibe.module.css";

const usd = (n: number) => `$${n.toFixed(2)}`;

/** The Plus pitch beside the vibes. Prices and credits come from lib/plan. */
export default function PlusCard({ compact = false }: { compact?: boolean }) {
  const { openUpgrade } = useUpgrade();
  const hallFinder = useHallFinderOn();
  const head = `All ${STYLES.length} vibes with Plus`;
  if (compact) {
    return (
      <button type="button" className={css.plusStrip} onClick={() => openUpgrade("style")}>
        <span className={css.plusStripText}>
          <strong>{head}</strong>
          <span>
            <SaleSwap
              regular={`${usd(PLUS_PRICE_USD)} one-time · ${PLUS_INITIAL_CREDITS} plan credits`}
              sale={`Black Friday ${usd(SALE_OFFER.plus.cents / 100)}, regularly ${usd(PLUS_PRICE_USD)} · ${SALE_OFFER.plus.credits} plan credits`}
            />
          </span>
        </span>
        <span className={css.plusStripGo}>Get Plus</span>
      </button>
    );
  }
  return (
    <div className={css.plus}>
      <p className={css.plusHead}>{head}</p>
      <p className={css.plusText}>
        <PlanCredits tier="plus" />, {hallFinder && <><strong className={css.plusHot}>Hall Finder</strong>, </>}PDF and PNG
        export, and compare two designs side by side.
      </p>
      <div className={css.plusFoot}>
        <span className={css.plusPrice}>
          <strong><PlanPrice tier="plus" /></strong>
          <span>one-time</span>
        </span>
        <button type="button" className={css.plusBtn} onClick={() => openUpgrade("style")}>
          Get Plus
        </button>
      </div>
      <SaleNote tier="plus" />
    </div>
  );
}
