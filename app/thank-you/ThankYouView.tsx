"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import FeedbackForm from "@/components/products/FeedbackForm";
import { ArrowRight } from "@/components/ds/Icons";
import { track } from "@/lib/analytics";
import css from "@/components/report/ThankYou.module.css";

const SHARE_URL = "https://dormscape.us";
const SHARE_LABEL = "dormscape.us";

/**
 * The cards under the /thank-you hero: share Dormscape with a roommate, rate
 * the experience, and head back to the design. The page's headline lives in
 * the server-rendered hero (app/thank-you/page.tsx).
 */
export default function ThankYouView() {
  const [canShare, setCanShare] = useState(false);
  const [copied, setCopied] = useState(false);
  const viewedRef = useRef(false);

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    if (!viewedRef.current) {
      viewedRef.current = true;
      track("confirmation_page_viewed");
    }
  }, []);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(SHARE_URL);
      setCopied(true);
      track("share_link_copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleShare() {
    if (typeof navigator === "undefined" || typeof navigator.share !== "function") return;
    try {
      await navigator.share({
        title: "Dormscape",
        text: "Plan your dorm room for free with Dormscape.",
        url: SHARE_URL,
      });
      track("share_link_shared");
    } catch {
      // User cancelled the share sheet, nothing to do.
    }
  }

  return (
    <div className={css.view}>
      <div className={css.cards}>
        {/* Share panel */}
        <div className={css.share} data-reveal="">
          <p className={css.shareLabel}>Share Dormscape</p>
          <p className={css.shareText}>
            If this made your move-in easier, send it to a roommate. It&apos;s free for
            them too.
          </p>
          {canShare && (
            <button type="button" onClick={handleShare} className={css.shareBtn}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
              </svg>
              Share
            </button>
          )}
          <div className={css.copyRow}>
            <input
              type="text"
              readOnly
              value={SHARE_LABEL}
              aria-label="Dormscape link"
              onFocus={(e) => e.currentTarget.select()}
              className={css.copyInput}
            />
            <button
              type="button"
              onClick={handleCopy}
              className={css.copyBtn}
              data-copied={copied || undefined}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Feedback */}
        <div className={`ds-card ${css.feedback}`} data-reveal="" style={{ "--i": 1 } as React.CSSProperties}>
          <FeedbackForm source="thank_you" />
        </div>
      </div>

      <p className={css.back} data-reveal="" style={{ "--i": 2 } as React.CSSProperties}>
        <Link href="/plan/result" className={css.backLink}>
          <ArrowRight className={css.backArrow} />
          Back to my design
        </Link>
      </p>
    </div>
  );
}
