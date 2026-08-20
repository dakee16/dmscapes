"use client";

// The 10th Step-2 tile: "Create your own vibe" (Pro). Deliberately distinct
// from the nine illustrated StyleCards — no room illustration, a single sparkle
// on a dashed cobalt field — so it reads as "author your own," not a preset.
// The Pro badge reuses the amber lock-pill treatment of the gated StyleCards.
export default function CreateVibeCard({
  selected,
  locked = false,
  onSelect,
}: {
  selected: boolean;
  /** True for a non-Pro user: badged; clicking opens the upgrade modal (caller). */
  locked?: boolean;
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
          : "border-ink/10 hover:-translate-y-[3px] hover:scale-[1.015] hover:border-cobalt/40 hover:shadow-[0_22px_48px_-22px_rgba(23,23,43,0.4)]"
      }`}
    >
      {locked && !selected && (
        <span className="absolute left-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-highlight px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink shadow-sm">
          <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
          </svg>
          Pro
        </span>
      )}
      {selected && (
        <span className="snap-in absolute right-2 top-2 z-10 grid h-6 w-6 place-items-center rounded-full bg-cobalt text-white shadow-md">
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      )}
      {/* Icon field: a sparkle on a dashed cobalt-tinted panel. */}
      <span
        className="relative flex h-20 w-full items-center justify-center border-b border-ink/8 bg-[#eef1ff]"
        aria-hidden="true"
      >
        <span className="absolute inset-2 rounded-lg border border-dashed border-cobalt/30" />
        <svg viewBox="0 0 24 24" className="relative h-8 w-8 text-cobalt" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" />
          <path d="M19 15l.7 1.8L21.5 17.5l-1.8.7L19 20l-.7-1.8L16.5 17.5l1.8-.7L19 15z" />
        </svg>
      </span>
      <span className="flex w-full items-center justify-between gap-2 p-3.5">
        <span className="flex flex-col">
          <span className="font-display text-base font-bold tracking-tight">Create your own</span>
          <span className="mt-1 text-xs leading-relaxed text-ink-soft">
            describe any vibe · live-matched
          </span>
        </span>
      </span>
    </button>
  );
}
