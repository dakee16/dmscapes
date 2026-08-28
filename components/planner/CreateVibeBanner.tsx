"use client";

// Item 3: the wide "Create your own vibe" banner that spans the full width of
// the style grid, below the nine vibe tiles. Its illustration is a horizontal
// run of small furniture/decor pieces pulled from DIFFERENT curated vibes (a
// nod to "any style, your choice"), drawn in the same line-art language as
// StyleScene, layered + angled + shadowed for depth, each floating independently
// (staggered vibe-float, reduced-motion aware). The Pro badge stays visible.

const STROKE = "rgba(23, 23, 43, 0.4)";
const INK = "#17172b";

// One decor piece per curated vibe. Each renders inside a floating, angled,
// shadowed tile so the row reads as a shelf of samplers from across the vibes.
const PIECES: {
  label: string;
  wall: string;
  rotate: number;
  dur: string;
  delay: string;
  dist: string;
  art: React.ReactNode;
}[] = [
  {
    // Minimalist, platform bed
    label: "minimalist",
    wall: "#f6f6f3",
    rotate: -6,
    dur: "6.5s",
    delay: "0s",
    dist: "9px",
    art: (
      <>
        <rect x="8" y="30" width="40" height="14" rx="2.5" fill="#e9e8e2" stroke={STROKE} />
        <rect x="11" y="22" width="15" height="9" rx="3" fill="#ffffff" stroke={STROKE} />
        <line x1="12" y1="44" x2="12" y2="50" stroke={STROKE} />
        <line x1="44" y1="44" x2="44" y2="50" stroke={STROKE} />
      </>
    ),
  },
  {
    // Retro, mushroom lamp
    label: "retro",
    wall: "#f6e6c4",
    rotate: 5,
    dur: "7.5s",
    delay: "0.6s",
    dist: "12px",
    art: (
      <>
        <path d="M16 30 Q28 12 40 30 Z" fill="#e08a2e" opacity="0.9" stroke={STROKE} />
        <rect x="25" y="30" width="6" height="18" fill="#f2ddb5" stroke={STROKE} />
        <ellipse cx="28" cy="49" rx="9" ry="2.5" fill="#a8471f" opacity="0.6" />
      </>
    ),
  },
  {
    // Boho, potted plant
    label: "boho",
    wall: "#f4eddd",
    rotate: -3,
    dur: "8s",
    delay: "0.25s",
    dist: "10px",
    art: (
      <>
        <path d="M28 34 C20 26 20 14 28 12 C36 14 36 26 28 34" fill="#6b7f3a" opacity="0.85" stroke={STROKE} strokeWidth="0.8" />
        <path d="M28 34 C24 28 26 20 28 16" fill="none" stroke="#3f5227" strokeOpacity="0.6" strokeWidth="0.8" />
        <path d="M20 34 h16 l-3 14 h-10 z" fill="#d9a45b" stroke={STROKE} />
      </>
    ),
  },
  {
    // Academia, armchair
    label: "academia",
    wall: "#f3e9d4",
    rotate: 6,
    dur: "6.8s",
    delay: "0.9s",
    dist: "11px",
    art: (
      <>
        <path d="M14 24 q0 -6 6 -6 h16 q6 0 6 6 v10 h-28 z" fill="#7c5230" opacity="0.85" stroke={STROKE} />
        <rect x="12" y="30" width="8" height="12" rx="3" fill="#c69a4f" stroke={STROKE} />
        <rect x="38" y="30" width="8" height="12" rx="3" fill="#c69a4f" stroke={STROKE} />
        <rect x="18" y="34" width="22" height="8" rx="2" fill="#efe4cb" stroke={STROKE} />
        <line x1="18" y1="42" x2="18" y2="49" stroke={STROKE} />
        <line x1="40" y1="42" x2="40" y2="49" stroke={STROKE} />
      </>
    ),
  },
  {
    // Pastel, framed art
    label: "pastel",
    wall: "#ffeef6",
    rotate: -7,
    dur: "7.2s",
    delay: "0.45s",
    dist: "13px",
    art: (
      <>
        <rect x="15" y="14" width="26" height="30" rx="2" fill="#ffffff" stroke={STROKE} />
        <path d="M20 40 l6 -10 l5 6 l4 -6 l4 10 z" fill="#c8b6ff" opacity="0.8" />
        <circle cx="24" cy="22" r="3" fill="#ffb3d9" />
        <rect x="24" y="44" width="8" height="5" fill="#bde0fe" stroke={STROKE} strokeWidth="0.6" />
      </>
    ),
  },
  {
    // Gamer, monitor / battlestation
    label: "gamer",
    wall: "#eceafb",
    rotate: 4,
    dur: "8.4s",
    delay: "1.1s",
    dist: "9px",
    art: (
      <>
        <rect x="12" y="16" width="32" height="20" rx="2" fill="#0d0d17" stroke={STROKE} />
        <rect x="15" y="19" width="26" height="14" rx="1" fill="#22d3ee" opacity="0.5" />
        <rect x="25" y="36" width="6" height="6" fill="#3b3b4f" stroke={STROKE} strokeWidth="0.6" />
        <rect x="18" y="42" width="20" height="4" rx="1.5" fill="#7c3aed" opacity="0.8" stroke={STROKE} strokeWidth="0.6" />
      </>
    ),
  },
];

// The Pro badge always shows; gating happens in the caller's onSelect (a non-Pro
// click opens the upgrade modal), so the banner itself needs no locked variant.
export default function CreateVibeBanner({
  onSelect,
  unlocked = false,
}: {
  onSelect: () => void;
  /** Pro users already have this: the badge reads "Unlocked" instead of "Pro",
   *  matching how the Plus-gated vibe tiles show access. */
  unlocked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="group relative col-span-2 w-full overflow-hidden rounded-2xl border-2 border-ink/10 bg-white text-left transition-all duration-200 ease-out hover:-translate-y-[3px] hover:border-cobalt/40 hover:shadow-[0_28px_60px_-28px_rgba(43,78,255,0.45)] sm:col-span-3"
    >
      {/* Gradient wash + grid paper for the premium depth ground. */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: "linear-gradient(105deg, #f4f6ff 0%, #ffffff 46%, #eef1ff 100%)" }}
        aria-hidden="true"
      />
      <span className="grid-paper grid-paper-fade pointer-events-none absolute inset-0 opacity-60" aria-hidden="true" />

      <span className="relative flex flex-col gap-4 p-5 sm:p-6">
        {/* Single heading line at the top: Pro badge + heading + go affordance. */}
        <span className="flex items-center gap-2.5">
          {unlocked ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-cobalt px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 7.5-1.5" strokeLinecap="round" />
              </svg>
              Unlocked
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-highlight px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink shadow-sm">
              <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <rect x="5" y="11" width="14" height="9" rx="2" />
                <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
              </svg>
              Pro
            </span>
          )}
          <span className="font-display text-lg font-extrabold tracking-tight text-ink sm:text-xl">
            Create your own vibe
          </span>
          <svg viewBox="0 0 24 24" className="ml-auto h-4 w-4 shrink-0 text-ink-soft transition-all group-hover:translate-x-0.5 group-hover:text-cobalt" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>

        {/* Furniture sampler drawn from across the vibes, full width below. */}
        <span className="relative flex flex-wrap items-end gap-2.5 sm:gap-3" aria-hidden="true">
          {PIECES.map((p) => (
            <span
              key={p.label}
              className="vibe-float grid h-16 w-16 place-items-center rounded-xl border border-ink/10 shadow-[0_10px_24px_-12px_rgba(23,23,43,0.4)] sm:h-[4.75rem] sm:w-[4.75rem]"
              style={
                {
                  background: p.wall,
                  transform: `rotate(${p.rotate}deg)`,
                  "--float-dur": p.dur,
                  "--float-delay": p.delay,
                  "--float-dist": p.dist,
                } as React.CSSProperties
              }
            >
              <svg viewBox="0 0 56 56" className="h-11 w-11" fill="none" stroke={INK} strokeOpacity="0.75" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
                {p.art}
              </svg>
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}
