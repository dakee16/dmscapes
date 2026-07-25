// Presentational only (no hooks) so it renders in both server and client trees.

export const ESTIMATED_DIMS_NOTE =
  "Estimated based on similar rooms. Official size not published.";

/**
 * Honest, de-emphasized label shown next to a room size that was estimated from
 * the median of same-type rooms (see scripts/build-schools-index.mjs) rather
 * than published by the school. Muted but plainly legible on purpose — a trust
 * signal, not fine print to bury.
 */
export default function EstimatedDimsNote({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] leading-tight text-ink-soft ${className}`}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3 w-3 shrink-0"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11.5v4.5" strokeLinecap="round" />
        <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
      </svg>
      {ESTIMATED_DIMS_NOTE}
    </span>
  );
}
