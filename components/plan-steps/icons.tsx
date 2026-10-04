type P = { size?: number; className?: string; strokeWidth?: number };

/** Planner-only glyphs the kit (components/ds/Icons) doesn't carry yet. */

export function ChevronLeft({ size = 16, className, strokeWidth = 2.4 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M15 6l-6 6 6 6" />
    </svg>
  );
}

export function LockIcon({ size = 11, className, strokeWidth = 2.8 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true" className={className}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

export function PencilIcon({ size = 18, className, strokeWidth = 2.2 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d="M3 21l3.5-1 11-11-2.5-2.5-11 11L3 21z" />
      <path d="M14 5l2.5 2.5" />
    </svg>
  );
}

export function PlusIcon({ size = 18, className, strokeWidth = 2.2 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" aria-hidden="true" className={className}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function RulerIcon({ size = 18, className, strokeWidth = 2.2 }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <rect x="2.5" y="8" width="19" height="8" rx="1.5" />
      <path d="M6.5 8v3M10.5 8v4M14.5 8v3M18.5 8v4" />
    </svg>
  );
}
