"use client";

import { STYLES } from "@/lib/styles";
import { PLUS_INITIAL_CREDITS, PLUS_PRICE_USD, PLUS_PRICE_WAS_USD } from "@/lib/plan";
import { useUpgrade } from "@/lib/upgrade-context";
import css from "./Vibe.module.css";

const usd = (n: number) => `$${n.toFixed(2)}`;

/** The Plus pitch beside the vibes. Prices and credits come from lib/plan. */
export default function PlusCard({ compact = false }: { compact?: boolean }) {
  const { openUpgrade } = useUpgrade();
  const head = `All ${STYLES.length} vibes with Plus`;
  if (compact) {
    return (
      <button type="button" className={css.plusStrip} onClick={() => openUpgrade("style")}>
        <span className={css.plusStripText}>
          <strong>{head}</strong>
          <span>
            {usd(PLUS_PRICE_USD)} one-time · {PLUS_INITIAL_CREDITS} plan credits
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
        {PLUS_INITIAL_CREDITS} plan credits, PDF and PNG export, and compare two designs side by side.
      </p>
      <div className={css.plusFoot}>
        <span className={css.plusPrice}>
          <strong>{usd(PLUS_PRICE_USD)}</strong>
          {PLUS_PRICE_WAS_USD > PLUS_PRICE_USD && (
            <s>
              <span className="ds-sr">was </span>
              {usd(PLUS_PRICE_WAS_USD)}
            </s>
          )}
          <span>one-time</span>
        </span>
        <button type="button" className={css.plusBtn} onClick={() => openUpgrade("style")}>
          Get Plus
        </button>
      </div>
    </div>
  );
}
