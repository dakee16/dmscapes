"use client";

import StyleScene from "@/components/site/StyleScene";
import type { StyleMeta } from "@/lib/styles";

export default function StyleCard({
  style,
  selected,
  locked = false,
  unlocked = false,
  onSelect,
}: {
  style: StyleMeta;
  selected: boolean;
  /** True for a Plus-gated style shown to a free user: badged, and clicking
   *  opens the upgrade modal instead of selecting (handled by the caller). */
  locked?: boolean;
  /** True for a Plus-gated style shown to a paid (Plus/Pro) user who already
   *  has access: shows an "Unlocked" badge in place of the lock. */
  unlocked?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`group relative flex w-full flex-col items-start overflow-hidden rounded-xl border-2 bg-white text-left transition-all duration-200 ease-out will-change-transform active:translate-y-0 active:scale-[0.99] active:duration-75 motion-reduce:transform-none motion-reduce:transition-none ${
        selected
          ? "border-cobalt shadow-[0_16px_40px_-20px_rgba(43,78,255,0.45)]"
          : "border-ink/10 hover:-translate-y-[3px] hover:scale-[1.015] hover:border-ink/25 hover:shadow-[0_22px_48px_-22px_rgba(23,23,43,0.4)]"
      }`}
    >
      {locked && !selected && (
        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-highlight px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink shadow-sm">
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
          </svg>
          Plus
        </span>
      )}
      {/* Paid users already have every vibe: the former lock reads as "Unlocked"
          (open padlock) so the Plus-only status is still legible as a perk. */}
      {unlocked && !selected && (
        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-cobalt px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 7.5-1.5" strokeLinecap="round" />
          </svg>
          Unlocked
        </span>
      )}
      {selected && (
        <span className="snap-in absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-cobalt text-white shadow-md">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      <StyleScene id={style.id} className={`h-20 w-full border-b border-ink/8 ${locked ? "opacity-90" : ""}`} />
      <span className="flex w-full items-center justify-between gap-2 p-3.5">
        <span className="flex flex-col">
          <span className="font-display text-base font-bold tracking-tight">{style.name}</span>
          <span className="mt-1 text-xs leading-relaxed text-ink-soft">
            {style.keywords.join(" · ")}
          </span>
        </span>
      </span>
    </button>
  );
}
