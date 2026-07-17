"use client";

import type { StyleMeta } from "@/lib/styles";

export default function StyleCard({
  style,
  selected,
  onSelect,
}: {
  style: StyleMeta;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex w-full flex-col items-start rounded-xl border-2 bg-white p-4 text-left transition-all ${
        selected
          ? "border-cobalt shadow-[0_16px_40px_-20px_rgba(43,78,255,0.45)]"
          : "border-ink/10 hover:border-ink/25 hover:shadow-[0_16px_40px_-20px_rgba(23,23,43,0.35)]"
      }`}
    >
      {selected && (
        <span className="snap-in absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-cobalt text-white shadow-md">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      <span className="text-2xl" aria-hidden="true">
        {style.emoji}
      </span>
      <span className="mt-2 font-display text-base font-bold tracking-tight">{style.name}</span>
      <span className="mt-1 text-xs leading-relaxed text-ink-soft">
        {style.keywords.join(" · ")}
      </span>
      <span className="mt-3 flex gap-1.5" aria-label={`${style.name} color palette`}>
        {style.palette.map((c) => (
          <span
            key={c}
            className="h-3.5 w-3.5 rounded-full border border-ink/15"
            style={{ backgroundColor: c }}
          />
        ))}
      </span>
    </button>
  );
}
