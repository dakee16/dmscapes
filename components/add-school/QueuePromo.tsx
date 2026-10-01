"use client";

import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { hasFeatures } from "@/lib/plan";
import css from "./AddSchool.module.css";

/**
 * The queue note from AddSchoolForm, moved beside the form as the design's
 * ink card. Plus and Pro members see that their request has priority;
 * everyone else gets the same upgrade sheet ("school-request").
 */
export default function QueuePromo() {
  const { profile } = useAuth();
  const { openUpgrade } = useUpgrade();
  const priority = hasFeatures(profile);

  if (priority) {
    return (
      <div className={css.promo}>
        <span className={css.promoText}>
          <span className={`ds-tag ${css.priorityTag}`}>Priority</span>
          <span className={css.promoSub}>Your request skips to the front of the queue.</span>
        </span>
      </div>
    );
  }

  return (
    <div className={css.promo}>
      <span className={css.promoText}>
        <span className={css.promoTitle}>Want yours added first?</span>
        <span className={css.promoSub}>Plus and Pro skip the queue.</span>
      </span>
      <button
        type="button"
        onClick={() => openUpgrade("school-request")}
        className={`ds-btn ds-btn--yellow ds-btn--sm ${css.promoBtn}`}
      >
        See plans
      </button>
    </div>
  );
}
