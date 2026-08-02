"use client";

// Coming-soon teaser for the shared-3D roommate feature. Opened from the
// header's "Room in 3D" nav item; controlled entirely by the caller.
import { useEffect, useRef } from "react";
import Room3DScene from "@/components/site/Room3DScene";

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

        {/* Angled 3D room preview: your side and theirs, one space. */}
        <Room3DScene className="mt-5" />
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
