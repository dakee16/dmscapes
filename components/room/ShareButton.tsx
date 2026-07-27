"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

/**
 * Round icon button that shares a saved design's /room/[id] link, the same
 * behavior as "Share my room" on the result page (native share sheet where
 * available, clipboard copy otherwise), packaged for reuse inside a tile.
 * Calls preventDefault/stopPropagation so it never triggers a surrounding link.
 */
export default function ShareButton({
  url,
  title,
  from,
  className = "",
}: {
  url: string;
  title?: string;
  /** analytics context, e.g. "account". */
  from?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({
          title: title ? `${title} · Dormscape` : "A Dormscape room",
          url,
        });
        track("share_clicked", { type: "share", from });
        return;
      } catch {
        // Cancelled or unsupported, fall through to clipboard.
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      track("share_clicked", { type: "link", from });
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      title={copied ? "Link copied" : "Share this design"}
      aria-label={copied ? "Link copied" : "Share this design"}
      className={`grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-ink/15 bg-white text-ink-soft transition-colors hover:border-cobalt hover:text-cobalt ${className}`}
    >
      {copied ? (
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px] text-cobalt"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          aria-hidden="true"
        >
          <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          className="h-[18px] w-[18px]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          aria-hidden="true"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}
