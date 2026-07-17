"use client";

import { useState } from "react";

type VibeKey = "minimalist" | "cozy" | "gamer" | "boho" | "preppy";

type Vibe = {
  label: string;
  bed: string;
  rug: string;
  accent: string;
  items: { name: string; store: "Amazon" | "Target"; price: number }[];
  total: number;
};

const VIBES: Record<VibeKey, Vibe> = {
  minimalist: {
    label: "Minimalist",
    bed: "#e9e8e2",
    rug: "#dddcd6",
    accent: "#17172b",
    items: [
      { name: "Washed-linen duvet, cloud white", store: "Target", price: 49 },
      { name: "Slim LED desk lamp", store: "Amazon", price: 24 },
      { name: "Under-bed storage, set of 2", store: "Amazon", price: 32 },
    ],
    total: 412,
  },
  cozy: {
    label: "Cozy",
    bed: "#f2ddc8",
    rug: "#ecd2b8",
    accent: "#c96f4a",
    items: [
      { name: "Warm-white fairy lights, 33 ft", store: "Amazon", price: 13 },
      { name: "Waffle-knit throw blanket", store: "Target", price: 28 },
      { name: "Photo-clip string kit", store: "Amazon", price: 16 },
    ],
    total: 438,
  },
  gamer: {
    label: "Gamer",
    bed: "#ddd8f6",
    rug: "#cfd9f2",
    accent: "#6d5bd0",
    items: [
      { name: "RGB LED strip, app-controlled", store: "Amazon", price: 19 },
      { name: "Single monitor arm, clamp mount", store: "Amazon", price: 35 },
      { name: "Gel seat cushion", store: "Target", price: 42 },
    ],
    total: 486,
  },
  boho: {
    label: "Boho",
    bed: "#ead9be",
    rug: "#dccba6",
    accent: "#8a7b4f",
    items: [
      { name: "Woven jute rug, 5×7", store: "Target", price: 45 },
      { name: "Macramé wall hanging", store: "Amazon", price: 22 },
      { name: "Rattan table lamp", store: "Target", price: 31 },
    ],
    total: 429,
  },
  preppy: {
    label: "Preppy",
    bed: "#d5dff5",
    rug: "#cadcca",
    accent: "#1e3a8a",
    items: [
      { name: "Striped reversible duvet set", store: "Target", price: 54 },
      { name: "Monogram throw pillow", store: "Amazon", price: 19 },
      { name: "Acrylic desk organizer", store: "Target", price: 21 },
    ],
    total: 445,
  },
};

const VIBE_KEYS = Object.keys(VIBES) as VibeKey[];
const BUDGET = 500;

function Piece({
  style,
  label,
  delay,
  className = "",
}: {
  style: React.CSSProperties;
  label?: string;
  delay: number;
  className?: string;
}) {
  return (
    <div
      className={`snap-in absolute flex items-center justify-center border border-ink/25 transition-colors duration-300 ${className}`}
      style={{ ...style, animationDelay: `${delay}ms` }}
    >
      {label && (
        <span className="font-mono text-[8px] font-medium uppercase tracking-[0.12em] text-ink/60 sm:text-[9px]">
          {label}
        </span>
      )}
    </div>
  );
}

export default function RoomPlanner() {
  const [vibeKey, setVibeKey] = useState<VibeKey>("cozy");
  const vibe = VIBES[vibeKey];

  return (
    <div className="rise w-full max-w-[480px] rounded-2xl border border-ink/10 bg-card shadow-[0_24px_60px_-24px_rgba(23,23,43,0.25)]" style={{ animationDelay: "200ms" }}>
      {/* App chrome */}
      <div className="flex items-center justify-between gap-2 border-b border-ink/10 px-4 py-3">
        <p className="truncate font-mono text-[11px] font-medium uppercase tracking-wide text-ink-soft">
          Michigan · Mosher-Jordan 212
        </p>
        <p className="shrink-0 font-mono text-[11px] font-semibold text-cobalt">
          15&apos;6&quot; × 12&apos;0&quot;
        </p>
      </div>

      {/* Vibe switcher */}
      <div className="flex flex-wrap gap-1.5 px-4 pt-3" role="group" aria-label="Choose a style vibe">
        {VIBE_KEYS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setVibeKey(key)}
            aria-pressed={key === vibeKey}
            className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
              key === vibeKey
                ? "border-ink bg-ink text-white"
                : "border-ink/15 bg-white text-ink-soft hover:border-ink/40 hover:text-ink"
            }`}
          >
            {VIBES[key].label}
          </button>
        ))}
      </div>

      {/* Floor plan */}
      <div className="p-4">
        <div className="grid-paper relative aspect-[4/3] w-full overflow-hidden rounded-lg border-2 border-ink/70 bg-white [background-size:11.5%_15.3%]">
          {/* Window on top wall */}
          <div className="absolute left-[54%] top-0 h-[3px] w-[26%] bg-cobalt" aria-hidden="true" />

          {/* Door swing, bottom-right */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 75"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 100 53 A 20 20 0 0 0 80 73"
              fill="none"
              stroke="#4c4f63"
              strokeWidth="0.5"
              strokeDasharray="2 2"
              vectorEffect="non-scaling-stroke"
            />
            <line x1="100" y1="73" x2="100" y2="53" stroke="#17172b" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          </svg>

          <Piece
            label="Bed · Twin XL"
            delay={250}
            className="rounded-[5px]"
            style={{ left: "3.5%", top: "6%", width: "42%", height: "30%", backgroundColor: vibe.bed }}
          />
          <Piece
            label="Shelf"
            delay={640}
            className="rounded-[3px] bg-[#eef0ef]"
            style={{ left: "3.5%", top: "42%", width: "9%", height: "22%" }}
          />
          <Piece
            label="Rug"
            delay={380}
            className="rounded-full border-dashed"
            style={{ left: "36%", top: "40%", width: "30%", height: "34%", backgroundColor: vibe.rug }}
          />
          <Piece
            label="Desk"
            delay={445}
            className="rounded-[4px] bg-[#eef0ef]"
            style={{ left: "3.5%", top: "74%", width: "27%", height: "19%" }}
          />
          {/* Desk chair */}
          <Piece
            delay={510}
            className="rounded-full bg-[#e4e7e6]"
            style={{ left: "13%", top: "63%", width: "8.5%", height: "11%" }}
          />
          <Piece
            label="Wardrobe"
            delay={575}
            className="rounded-[4px] bg-[#eef0ef]"
            style={{ left: "70%", top: "5%", width: "26%", height: "16%" }}
          />
          <Piece
            label="Fridge"
            delay={700}
            className="rounded-[4px]"
            style={{ left: "70%", top: "78%", width: "10%", height: "15%", backgroundColor: vibe.rug }}
          />

          {/* Fit badge */}
          <div
            className="snap-in absolute right-2 top-[31%] rounded-md px-2 py-1 font-mono text-[9px] font-semibold uppercase tracking-wide text-ink"
            style={{ backgroundColor: "var(--color-highlight)", animationDelay: "950ms" }}
          >
            Everything fits ✓
          </div>
        </div>

        {/* Shoppable list */}
        <ul className="mt-4 space-y-2" aria-live="polite">
          {vibe.items.map((item) => (
            <li key={item.name} className="flex items-center gap-2.5 text-sm">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm transition-colors duration-300"
                style={{ backgroundColor: vibe.accent }}
                aria-hidden="true"
              />
              <span className="flex-1 truncate text-ink">{item.name}</span>
              <span className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[10px] uppercase text-ink-soft">
                {item.store}
              </span>
              <span className="w-10 text-right font-mono text-xs font-medium text-ink">
                ${item.price}
              </span>
            </li>
          ))}
        </ul>

        {/* Budget bar */}
        <div className="mt-4 border-t border-ink/10 pt-3">
          <div className="flex items-baseline justify-between">
            <span className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              14 items · full room
            </span>
            <span className="font-mono text-sm font-semibold text-ink">
              ${vibe.total}{" "}
              <span className="font-normal text-ink-soft">/ ${BUDGET} budget</span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/8">
            <div
              className="h-full rounded-full bg-cobalt transition-all duration-500"
              style={{ width: `${(vibe.total / BUDGET) * 100}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
