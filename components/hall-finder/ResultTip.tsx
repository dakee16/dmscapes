"use client";

// Plan result, first time only (design-handoff/hall-finder 17-Mentions): "Still choosing a
// hall?" for pilot schools. Sits in the shopping panel, never over the plan; it shows once,
// and dismissing it is remembered. Renders nothing unless Hall Finder is live or previewed.
import { useEffect, useState } from "react";
import Link from "next/link";
import { track } from "@/lib/analytics";
import { useHallFinderOn } from "./useHallFinderOn";
import css from "./ResultTip.module.css";

/** localStorage: the tip has been shown (it appears once) or dismissed. */
const RESULT_TIP_KEY = "dormscape-hf-result-tip";

export default function ResultTip({ collegeId, short }: { collegeId: string; short: string }) {
  const on = useHallFinderOn();
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (!on) return;
    try {
      if (localStorage.getItem(RESULT_TIP_KEY)) return;
      localStorage.setItem(RESULT_TIP_KEY, "shown");
    } catch {
      return;
    }
    setShow(true);
  }, [on]);
  if (!show) return null;
  const dismiss = () => {
    try {
      localStorage.setItem(RESULT_TIP_KEY, "dismissed");
    } catch {}
    setShow(false);
  };
  return (
    <aside className={css.tip} aria-label="Hall Finder tip">
      <span className={css.tipIcon} aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
          <circle cx="12" cy="9.5" r="2.5" />
        </svg>
      </span>
      <span className={css.tipText}>
        <strong>Still choosing a hall?</strong>
        <span>Hall Finder ranks {short} halls by your classes.</span>
      </span>
      <button type="button" className={css.tipClose} aria-label="Dismiss" onClick={dismiss}>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
      <Link href={`/colleges/${collegeId}/hall-finder`} className={`ds-btn ds-btn--ink-yellow ${css.tipGo}`} onClick={() => track("hall_finder_entry_clicked", { where: "result-tip" })}>
        Try Hall Finder
      </Link>
    </aside>
  );
}
