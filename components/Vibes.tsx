const VIBES = [
  {
    name: "Minimalist",
    line: "Clean lines, empty desk, nothing you don't need.",
    from: 240,
    wall: "#f2f2ef",
    bed: "#e9e8e2",
    rug: "#dddcd6",
    swatches: ["#17172b", "#e9e8e2", "#b9b8b0"],
  },
  {
    name: "Cozy Aesthetic",
    line: "Warm light, soft layers, film photos on string.",
    from: 310,
    wall: "#f9efe3",
    bed: "#f2ddc8",
    rug: "#ecd2b8",
    swatches: ["#c96f4a", "#f2ddc8", "#8f5b3d"],
  },
  {
    name: "Gamer",
    line: "Dual glow, clean cable runs, zero screen glare.",
    from: 420,
    wall: "#eceafb",
    bed: "#ddd8f6",
    rug: "#cfd9f2",
    swatches: ["#6d5bd0", "#22c8e0", "#17172b"],
  },
  {
    name: "Boho",
    line: "Plants, texture, thrifted everything.",
    from: 280,
    wall: "#f4eddd",
    bed: "#ead9be",
    rug: "#dccba6",
    swatches: ["#8a7b4f", "#dccba6", "#4f5d3f"],
  },
  {
    name: "Preppy",
    line: "Stripes, monograms, made-bed energy.",
    from: 350,
    wall: "#e9eef9",
    bed: "#d5dff5",
    rug: "#cadcca",
    swatches: ["#1e3a8a", "#0f6f4f", "#d5dff5"],
  },
];

export default function Vibes() {
  return (
    <section id="vibes" className="border-y border-ink/8 bg-white">
      <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
          Style showcase
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
          Pick a vibe. We make it fit.
        </h2>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
          Every vibe is a full plan (bedding, lighting, storage, decor), priced to your
          budget and arranged to your floor plan.
        </p>

        <div className="-mx-5 mt-12 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-4 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-5">
          {VIBES.map((vibe) => (
            <article
              key={vibe.name}
              className="group w-64 shrink-0 snap-start rounded-xl border border-ink/10 bg-paper transition-shadow hover:shadow-[0_16px_40px_-20px_rgba(23,23,43,0.35)] sm:w-auto"
            >
              {/* Abstract room preview */}
              <div
                className="relative h-36 overflow-hidden rounded-t-xl transition-colors"
                style={{ backgroundColor: vibe.wall }}
                aria-hidden="true"
              >
                <div
                  className="absolute bottom-4 left-4 h-12 w-24 rounded-md border border-ink/15"
                  style={{ backgroundColor: vibe.bed }}
                />
                <div
                  className="absolute -right-4 bottom-2 h-8 w-24 rounded-full border border-ink/10"
                  style={{ backgroundColor: vibe.rug }}
                />
                <div className="absolute left-6 top-5 h-6 w-10 rounded-sm border border-ink/15 bg-white/70" />
                <div className="absolute right-6 top-4 flex gap-1.5">
                  {vibe.swatches.map((c) => (
                    <span
                      key={c}
                      className="h-3.5 w-3.5 rounded-full border border-ink/15"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex flex-col p-4">
                <h3 className="font-display text-base font-bold">{vibe.name}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{vibe.line}</p>
                <p className="mt-3 font-mono text-xs font-medium text-cobalt">
                  from ${vibe.from}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
