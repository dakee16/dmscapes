"use client";

import { useEffect, useState } from "react";
import { VIBE_LOADING_LINES } from "@/lib/custom-vibe";

// Item 5: the large, premium loading state for a custom-vibe generation. A room
// canvas builds itself on a loop, furniture pieces fade and settle into place
// under the breathing Dormscape mark (echoing the real drag-to-arrange canvas)
//, with big cycling narrative copy and a progress bar beneath. Full-bleed so it
// fills the page rather than reading as a small centered spinner.

const STROKE = "rgba(23, 23, 43, 0.35)";

// Furniture that snaps into the loading room, in placement order. Each carries a
// stagger delay so they arrive one after another, then the loop resets. Zones are
// laid out to NOT overlap, so the room reads as cleanly built, never colliding.
const CANVAS_PIECES: { x: number; y: number; w: number; h: number; fill: string; delay: string }[] = [
  { x: 20, y: 22, w: 84, h: 46, fill: "#6366f1", delay: "0s" }, // bed, top-left
  { x: 140, y: 24, w: 64, h: 30, fill: "#10b981", delay: "0.45s" }, // desk, top-right
  { x: 20, y: 110, w: 34, h: 40, fill: "#f59e0b", delay: "0.9s" }, // dresser, lower-left
  { x: 86, y: 96, w: 72, h: 52, fill: "#ec4899", delay: "1.35s" }, // rug, center floor
  { x: 182, y: 92, w: 30, h: 64, fill: "#a855f7", delay: "1.8s" }, // shelf, right wall
];

export default function VibeLoading() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % VIBE_LOADING_LINES.length), 1400);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-8 overflow-hidden px-6 text-center"
      style={{ background: "linear-gradient(160deg, #eef1ff 0%, #ffffff 44%, #f4f6ff 100%)" }}
    >
      <span className="grid-paper-fade pointer-events-none absolute inset-0 opacity-80" aria-hidden="true" />

      {/* Breathing mark integrated above the room being planned. */}
      <div className="relative flex flex-col items-center gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/icons/icon-192.png"
          alt="Dormscape"
          width={72}
          height={72}
          className="brand-breathe relative h-[72px] w-[72px] select-none drop-shadow-[0_12px_28px_rgba(43,78,255,0.28)]"
          draggable={false}
        />

        {/* Room canvas building on a loop. */}
        <svg
          viewBox="0 0 236 188"
          className="h-auto w-[min(80vw,340px)] drop-shadow-[0_24px_60px_-24px_rgba(23,23,43,0.4)]"
          aria-hidden="true"
        >
          {/* room + faint grid floor */}
          <rect x="8" y="8" width="220" height="172" rx="14" fill="#ffffff" stroke={STROKE} strokeWidth="1.5" />
          <defs>
            <pattern id="vibe-load-grid" width="16" height="16" patternUnits="userSpaceOnUse">
              <path d="M16 0H0V16" fill="none" stroke="#17172b" strokeOpacity="0.05" strokeWidth="1" />
            </pattern>
          </defs>
          <rect x="8" y="8" width="220" height="172" rx="14" fill="url(#vibe-load-grid)" />
          {CANVAS_PIECES.map((p, idx) => (
            <g key={idx} className="vibe-snap" style={{ "--snap-delay": p.delay } as React.CSSProperties}>
              <rect
                x={p.x}
                y={p.y}
                width={p.w}
                height={p.h}
                rx="4"
                fill={p.fill}
                fillOpacity="0.32"
                stroke={p.fill}
                strokeOpacity="0.85"
                strokeWidth="1.5"
              />
            </g>
          ))}
        </svg>
      </div>

      {/* Big cycling narrative copy. */}
      <div className="relative flex min-h-[3.5rem] items-center sm:min-h-[4.5rem]">
        <p key={i} className="fade-in max-w-3xl font-display text-3xl font-extrabold tracking-tight text-ink sm:text-5xl">
          {VIBE_LOADING_LINES[i]}
        </p>
      </div>

      {/* Progress bar + honest note. */}
      <div className="relative w-full max-w-md">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
          <div className="vibe-progress-bar h-full w-1/3 rounded-full bg-cobalt" />
        </div>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          Matching live products to your vibe, a little longer than a preset
        </p>
      </div>
    </div>
  );
}
