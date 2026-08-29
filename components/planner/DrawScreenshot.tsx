"use client";

import { useState } from "react";

/**
 * A single screenshot slot for the "Draw your own room" section on Step 1.
 * Shows a placeholder until an image exists at `src` (public/screenshots/...):
 * a 404 fires onError and the placeholder shows; drop the file in and it appears,
 * no code change needed.
 */
export default function DrawScreenshot({
  src = "/screenshots/draw-your-room.png",
}: {
  src?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-ink/10 bg-ink/[0.03] shadow-[0_18px_44px_-30px_rgba(23,23,43,0.5)]">
      {!failed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="The Dormscape room drawing tool"
          onError={() => setFailed(true)}
          onLoad={(e) => {
            // A missing file can "load" empty without firing onError; treat a
            // zero-size image as a miss so the placeholder shows.
            if (e.currentTarget.naturalWidth === 0) setFailed(true);
          }}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="grid-paper absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2 text-ink-soft">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-ink/15 bg-white/80 text-cobalt shadow-sm">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.16em]">
              Drawing tool preview
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
