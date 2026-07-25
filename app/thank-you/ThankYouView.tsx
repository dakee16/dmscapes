"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { REVEAL_EASE } from "@/components/site/Reveal";
import PanelGrid from "@/components/site/PanelGrid";
import FeedbackForm from "@/components/products/FeedbackForm";
import { track } from "@/lib/analytics";

const SHARE_URL = "https://dormscape.us";
const SHARE_LABEL = "dormscape.us";

export default function ThankYouView() {
  const reduceMotion = useReducedMotion();

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
      // User cancelled the share sheet — nothing to do.
    }
  }

  return (
    <div>
      {/* The success moment */}
      <div className="rise flex flex-col items-center text-center">
        <motion.div
          initial={reduceMotion ? false : { scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: REVEAL_EASE }}
          className="grid h-20 w-20 place-items-center rounded-full bg-cobalt"
        >
          <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" aria-hidden="true">
            <motion.path
              d="M5 12.5l4.8 4.8L19 6.5"
              stroke="#ffffff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduceMotion ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.45, delay: 0.3, ease: "easeOut" }}
            />
          </svg>
        </motion.div>
        <h1 className="mt-6 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
          Thank you for using <span className="hl">Dormscape</span>.
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ink-soft">
          Your haul is on its way, and your room already knows where everything goes.
          That&apos;s one big move-in task, handled.
        </p>
      </div>

      {/* Share panel — the same cobalt CTA language as the rest of the site */}
      <div
        className="rise relative mt-10 overflow-hidden rounded-2xl bg-cobalt p-5 sm:p-6"
        style={{ animationDelay: "120ms" }}
      >
        <PanelGrid />
        <div className="relative">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-highlight">
            Share Dormscape
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-white/85">
            If this made your move-in easier, send it to a roommate. It&apos;s free for
            them too.
          </p>
          {canShare && (
            <button
              type="button"
              onClick={handleShare}
              className="mt-4 flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-white text-sm font-semibold text-ink transition-colors hover:bg-highlight"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
              </svg>
              Share
            </button>
          )}
          <div className={`flex items-center gap-2 ${canShare ? "mt-2" : "mt-4"}`}>
            <input
              type="text"
              readOnly
              value={SHARE_LABEL}
              aria-label="Dormscape link"
              onFocus={(e) => e.currentTarget.select()}
              className="h-11 min-w-0 flex-1 rounded-xl bg-white/15 px-4 font-mono text-sm text-white outline-none"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`h-11 shrink-0 cursor-pointer rounded-xl px-4 text-sm font-semibold text-ink transition-colors ${
                copied ? "bg-highlight" : "bg-white hover:bg-highlight"
              }`}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
      </div>

      {/* Feedback */}
      <div
        className="rise mt-4 rounded-2xl border border-ink/10 bg-white p-5 sm:p-6"
        style={{ animationDelay: "200ms" }}
      >
        <FeedbackForm source="thank_you" />
      </div>

      <div className="rise mt-8 text-center" style={{ animationDelay: "280ms" }}>
        <Link
          href="/plan/result"
          className="text-sm font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt"
        >
          ← Back to my design
        </Link>
      </div>
    </div>
  );
}
