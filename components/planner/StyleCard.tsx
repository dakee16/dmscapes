"use client";

import { Check } from "@/components/ds/Icons";
import { LockIcon } from "@/components/plan-steps/icons";
import type { CSSProperties } from "react";
import { schoolLabel, vibeMeta } from "@/components/plan-steps/room-model";
import { usePlannerStore } from "@/lib/store";
import { schoolColors } from "@/lib/school-colors";
import type { StyleMeta } from "@/lib/styles";
import css from "@/components/plan-steps/Vibe.module.css";

/**
 * One vibe as a fabric swatch in its palette. Plus vibes stay visible for
 * free users with a lock; the caller opens the upgrade sheet on click.
 */
export default function StyleCard({
  style,
  selected,
  locked = false,
  unlocked = false,
  onSelect,
}: {
  style: StyleMeta;
  selected: boolean;
  /** True for a Plus-gated style shown to a free user: badged, and clicking
   *  opens the upgrade modal instead of selecting (handled by the caller). */
  locked?: boolean;
  /** True for a Plus-gated style shown to a paid (Plus/Pro) user who already
   *  has access: shows an "Unlocked" badge in place of the lock. */
  unlocked?: boolean;
  onSelect: () => void;
}) {
  const college = usePlannerStore((st) => st.college);
  // Team Spirit shows the student's school colors (when we know them) on its swatch and says so.
  const spirit = style.id === "team_spirit" ? schoolColors(college?.id) : undefined;
  const base = vibeMeta(style.id)?.line ?? style.keywords.join(", ");
  const line = spirit ? `In ${schoolLabel(college)} colors. ${base}` : base;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={locked ? undefined : selected}
      aria-label={locked ? `${style.name}, included with Plus` : undefined}
      className={css.card}
      data-selected={selected}
      data-locked={locked}
    >
      <span className={css.swatch} data-vibe={style.id} aria-hidden="true"
        style={spirit ? { "--spirit-a": spirit[0], "--spirit-b": spirit[1], "--spirit-c": "#fff" } as CSSProperties : undefined} />
      {selected && (
        <span className={css.tick} aria-hidden="true">
          <Check size={15} strokeWidth={3.2} />
        </span>
      )}
      <span className={css.body}>
        <span className={css.nameRow}>
          <span className={css.name}>{style.name}</span>
          {locked ? (
            <span className={css.tier} data-tier="plus">
              <LockIcon />
              Plus
            </span>
          ) : unlocked ? (
            <span className={css.tier} data-tier="unlocked">
              Unlocked
            </span>
          ) : (
            <span className={css.tier}>Free</span>
          )}
        </span>
        <span className={css.line}>{line}</span>
      </span>
    </button>
  );
}
