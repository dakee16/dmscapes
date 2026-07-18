import Reveal from "@/components/site/Reveal";
import StyleScene from "@/components/site/StyleScene";
import type { StyleId } from "@/lib/types";

const VIBES: { id: StyleId; name: string; line: string; from: number }[] = [
  {
    id: "minimalist",
    name: "Minimalist",
    line: "Clean lines, empty desk, nothing you don't need.",
    from: 240,
  },
  {
    id: "cozy",
    name: "Cozy Aesthetic",
    line: "Warm light, soft layers, film photos on string.",
    from: 310,
  },
  {
    id: "gamer",
    name: "Gamer",
    line: "Dual glow, clean cable runs, zero screen glare.",
    from: 420,
  },
  {
    id: "boho",
    name: "Boho",
    line: "Plants, texture, thrifted everything.",
    from: 280,
  },
  {
    id: "preppy",
    name: "Preppy",
    line: "Stripes, monograms, made-bed energy.",
    from: 350,
  },
];

export default function Vibes() {
  return (
    <section id="vibes" className="border-y border-ink/8 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <Reveal stagger>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            Style showcase
          </p>
          <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Pick a vibe. We make it fit.
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
            Every vibe is a full plan: bedding, lighting, storage, and decor, priced to
            your budget and arranged to your floor plan.
          </p>
        </Reveal>

        <Reveal
          stagger
          className="-mx-5 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5"
          itemClassName="w-64 shrink-0 snap-start sm:w-auto"
        >
          {VIBES.map((vibe) => (
            <article
              key={vibe.id}
              className="h-full overflow-hidden rounded-xl border border-ink/10 bg-paper transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(23,23,43,0.35)]"
            >
              <StyleScene id={vibe.id} className="h-36 w-full" />
              <div className="flex flex-col border-t border-ink/8 p-4">
                <h3 className="font-display text-base font-bold">{vibe.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{vibe.line}</p>
                <p className="mt-3 font-mono text-xs font-medium text-cobalt">
                  from ${vibe.from}
                </p>
              </div>
            </article>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
