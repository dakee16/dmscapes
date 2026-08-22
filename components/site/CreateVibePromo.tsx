import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import StyleScene from "@/components/site/StyleScene";
import type { StyleId } from "@/lib/types";

// Dedicated homepage section for the Pro "Create your own vibe" feature (its own
// headline + CTA + real space in the scroll, replacing the small strip that used
// to sit folded inside the Vibes section). The illustration is a layered cluster
// of floating StyleScene tiles — the same line-art vibe language used in the
// picker and the create-vibe input page — angled, shadowed, and idle-floating
// (vibe-float, reduced-motion aware) so it reads as "any aesthetic, your call".
const TILES: {
  id: StyleId;
  wrap: string;
  rotate: number;
  dur: string;
  delay: string;
  dist: string;
}[] = [
  { id: "cozy", wrap: "col-start-1 row-start-1 z-20", rotate: -5, dur: "6.6s", delay: "0s", dist: "10px" },
  { id: "gamer", wrap: "col-start-2 row-start-1 mt-10 z-10", rotate: 4, dur: "7.8s", delay: "0.5s", dist: "13px" },
  { id: "academia", wrap: "col-start-1 row-start-2 -mt-4 z-10", rotate: 3, dur: "7.1s", delay: "0.9s", dist: "9px" },
  { id: "boho", wrap: "col-start-2 row-start-2 -mt-2 z-20", rotate: -4, dur: "8.3s", delay: "0.3s", dist: "12px" },
];

export default function CreateVibePromo() {
  return (
    <section id="create-your-own" className="relative overflow-hidden border-y border-ink/8 bg-paper">
      {/* Brand ground: a soft amber -> cobalt wash (the create-vibe page's
          signature) over faded grid paper, dissolving into the base surface. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(115deg, rgba(255,216,77,0.12) 0%, rgba(255,216,77,0.03) 38%, rgba(43,78,255,0.035) 70%, rgba(43,78,255,0.11) 100%)",
        }}
      />
      <span
        aria-hidden="true"
        className="grid-paper grid-paper-fade pointer-events-none absolute inset-0 opacity-40"
      />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.03fr_0.97fr]">
        {/* LEFT: headline + copy + CTA */}
        <Reveal stagger>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-highlight px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink shadow-sm">
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <rect x="5" y="11" width="14" height="9" rx="2" />
              <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
            </svg>
            Pro · Create your own vibe
          </span>
          <h2 className="mt-4 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Not one of the nine? <span className="hl">Describe your own.</span>
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
            Type any aesthetic in your own words — &ldquo;warm beige study nook,&rdquo;
            &ldquo;chrome Y2K,&rdquo; a movie set, a color you love. Dormscape matches
            real products to it, live, and lays them out to your exact room.
          </p>
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
            <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cobalt" aria-hidden="true" />Your words, real products</li>
            <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cobalt" aria-hidden="true" />Fit to your budget</li>
            <li className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-cobalt" aria-hidden="true" />Laid out to the inch</li>
          </ul>
          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Link
              href="/plan"
              className="inline-flex h-13 items-center rounded-xl bg-cobalt px-7 text-base font-semibold text-white shadow-[0_16px_36px_-18px_rgba(43,78,255,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-cobalt-deep"
            >
              Build your own vibe
              <svg viewBox="0 0 24 24" className="ml-1.5 h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link href="/pricing" className="text-sm font-semibold text-cobalt transition-colors hover:text-cobalt-deep">
              What Pro includes
            </Link>
          </div>
        </Reveal>

        {/* RIGHT: layered, floating StyleScene sampler */}
        <Reveal className="relative">
          <div className="mx-auto grid w-full max-w-sm grid-cols-2 gap-4 sm:gap-5" aria-hidden="true">
            {TILES.map((t) => (
              <div
                key={t.id}
                className={`vibe-float overflow-hidden rounded-2xl border border-ink/10 bg-white shadow-[0_20px_44px_-24px_rgba(23,23,43,0.45)] ${t.wrap}`}
                style={
                  {
                    transform: `rotate(${t.rotate}deg)`,
                    "--float-dur": t.dur,
                    "--float-delay": t.delay,
                    "--float-dist": t.dist,
                  } as React.CSSProperties
                }
              >
                <StyleScene id={t.id} className="h-28 w-full sm:h-32" />
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
