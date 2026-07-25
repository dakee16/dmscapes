// Branded loading state: the Dormscape logo mark gently "breathing" (a soft
// scale + opacity loop defined in globals.css). Restrained on purpose — no
// spin, no bounce. Pure CSS on transform/opacity, so it adds no JavaScript to
// the wait and stays compositor-cheap; under prefers-reduced-motion it holds a
// static logo instead. No hooks, so it renders in any tree.
export default function BrandLoader({
  label = "Loading…",
  className = "",
}: {
  /** Small caption under the mark; pass "" to show the mark alone. */
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center gap-4 ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-192.png"
        alt="Dormscape"
        width={60}
        height={60}
        className="brand-breathe h-[60px] w-[60px] select-none"
        draggable={false}
      />
      {label && (
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-soft">
          {label}
        </span>
      )}
    </div>
  );
}
