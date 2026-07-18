"use client";

// Coming-soon teaser for the shared-3D roommate feature. Opened from the
// header's "Room in 3D" nav item; controlled entirely by the caller.
import { useEffect, useRef } from "react";

export default function RoommateTeaser({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => closeRef.current?.focus(), 60);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/40 p-0 backdrop-blur-[2px] sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="roommate-teaser-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="snap-in w-full max-w-md rounded-t-2xl border border-ink/10 bg-paper p-6 shadow-2xl sm:rounded-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            Coming soon
          </p>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-white hover:text-ink"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <h2
          id="roommate-teaser-title"
          className="mt-2 font-display text-2xl font-extrabold tracking-tight"
        >
          Your room. Your roommate. <span className="hl">One 3D view.</span>
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          Plan the same room together, from different couches. You each pick a
          side and a vibe, the layout stays in sync in a shared 3D room, and
          your budgets stay separate. We&rsquo;re building it now.
        </p>

        {/* Split-room sketch, locked on purpose, not broken */}
        <div className="grid-paper relative mt-5 overflow-hidden rounded-xl border border-dashed border-ink/25 bg-white">
          <svg viewBox="0 0 300 150" className="block w-full" aria-hidden="true">
            <rect
              x="20"
              y="16"
              width="260"
              height="118"
              rx="4"
              fill="none"
              strokeWidth="2.5"
              className="stroke-ink"
            />
            <line
              x1="150"
              y1="16"
              x2="150"
              y2="134"
              strokeWidth="1.5"
              strokeDasharray="5 5"
              className="stroke-ink/30"
            />
            <rect
              x="30"
              y="26"
              width="34"
              height="64"
              rx="3"
              strokeWidth="1.5"
              className="fill-cobalt/15 stroke-cobalt"
            />
            <rect
              x="30"
              y="104"
              width="46"
              height="20"
              rx="3"
              strokeWidth="1.5"
              className="fill-cobalt/15 stroke-cobalt"
            />
            <rect
              x="236"
              y="26"
              width="34"
              height="64"
              rx="3"
              strokeWidth="1.5"
              className="fill-highlight/40 stroke-amber"
            />
            <rect
              x="224"
              y="104"
              width="46"
              height="20"
              rx="3"
              strokeWidth="1.5"
              className="fill-highlight/40 stroke-amber"
            />
          </svg>
          <span className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full bg-ink px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-white shadow-lg">
            <svg
              viewBox="0 0 24 24"
              className="h-3 w-3 text-highlight"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              aria-hidden="true"
            >
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
            </svg>
            3D · Coming soon
          </span>
        </div>
        <div className="mt-3 flex items-center gap-5 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-cobalt" aria-hidden="true" />
            Your side
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber" aria-hidden="true" />
            Their side
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 h-12 w-full cursor-pointer rounded-xl bg-ink text-base font-semibold text-white transition-colors hover:bg-cobalt"
        >
          Got it
        </button>
        <a
          href="https://tiktok.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block text-center text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Follow on TikTok for updates
        </a>
      </div>
    </div>
  );
}
