"use client";

import { useId, useState } from "react";
import { ArrowRight } from "@/components/ds/Icons";
import css from "@/components/plan-steps/Vibe.module.css";

const EXAMPLE = "Warm oak. Cobalt. A lot of plants.";

/**
 * "Create your own vibe", the Pro field under the vibe grid. Pro members type
 * here and carry it to the vibe page; everyone else gets the upgrade sheet.
 * The caller owns Pro access, tracking and navigation.
 */
export default function CreateVibeBanner({
  onSelect,
  unlocked = false,
}: {
  onSelect: (text?: string) => void;
  unlocked?: boolean;
}) {
  const [text, setText] = useState("");
  const id = useId();

  return (
    <form
      className={css.own}
      onSubmit={(e) => {
        e.preventDefault();
        onSelect(text);
      }}
    >
      <div className={css.ownCopy}>
        <span className={css.ownHead}>
          <span className={css.ownTitle} id={`${id}-t`}>
            Create your own vibe
          </span>
          <span className={css.proTag}>Pro</span>
        </span>
        <span className={css.ownText}>Describe it in your own words. We find real products for it.</span>
      </div>
      {unlocked ? (
        <>
          <label htmlFor={`${id}-q`} className="ds-sr">
            Describe your vibe
          </label>
          <input
            id={`${id}-q`}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={EXAMPLE}
            className={css.ownInput}
            autoComplete="off"
          />
          <button type="submit" className={css.ownBtn}>
            Describe it
            <ArrowRight size={18} />
          </button>
        </>
      ) : (
        <>
          <span className={css.ownInput} data-fake="" aria-hidden="true">
            {EXAMPLE}
          </span>
          <button type="submit" className={css.ownBtn} aria-describedby={`${id}-t`}>
            Unlock with Pro
          </button>
        </>
      )}
    </form>
  );
}
