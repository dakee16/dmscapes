import Link from "next/link";
import Reveal from "@/components/site/Reveal";

// Homepage Plus pitch. Deliberately warm/light (highlight + paper), so it reads
// distinct from the ink and cobalt CTA blocks elsewhere on the page.
const MOMENTS: { title: string; body: string; icon: React.ReactNode }[] = [
  {
    title: "Two rooms, one call",
    body: "Save both, put them side by side, and let the totals settle it.",
    icon: (
      <path d="M9 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h4m6-16h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M12 3v18" />
    ),
  },
  {
    title: "A list they can read",
    body: "Export the whole cart as a tidy PDF for whoever's holding the card.",
    icon: (
      <path d="M8 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6H8zm5 0v5h5M9 13h6M9 17h6" />
    ),
  },
  {
    title: "Cut the school line",
    body: "Your add-my-school request jumps straight to the front of the queue.",
    icon: <path d="M13 5l7 7-7 7M4 5l7 7-7 7" />,
  },
  {
    title: "Four looks, Plus-only",
    body: "Gamer, Team Spirit, Retro, and Pastel come with Plus, each a full room in its own palette.",
    icon: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  },
];

export default function PlusPitch() {
  return (
    <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
      <Reveal>
        <div className="relative overflow-hidden rounded-2xl border border-ink/12 bg-card p-8 sm:p-12">
          <div className="grid-paper absolute inset-0 -z-10 opacity-40" aria-hidden="true" />
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-52 w-52 rounded-full bg-highlight/30 blur-3xl"
            aria-hidden="true"
          />

          <div className="relative max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-highlight px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink">
              <span className="font-display text-sm font-extrabold leading-none">+</span>
              Dormscape Plus
            </span>
            <h2 className="mt-4 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
              You&rsquo;ll have more than one good idea.
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-ink-soft">
              The cozy version and the bold one. The layout your budget likes and
              the one your heart does. Plus keeps every look you&rsquo;re torn
              between, so you get to actually choose instead of guessing.
            </p>
          </div>

          <div className="relative mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {MOMENTS.map((m) => (
              <div
                key={m.title}
                className="rounded-xl border border-ink/10 bg-paper/60 p-5"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-lg bg-highlight text-ink"
                  aria-hidden="true"
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    {m.icon}
                  </svg>
                </span>
                <h3 className="mt-3 font-display text-base font-bold tracking-tight">
                  {m.title}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-ink-soft">{m.body}</p>
              </div>
            ))}
          </div>

          <div className="relative mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
            <Link
              href="/pricing"
              className="inline-flex h-14 items-center rounded-xl bg-ink px-7 text-base font-semibold text-white transition-colors hover:bg-cobalt"
            >
              See what Plus unlocks
            </Link>
            <span className="font-mono text-xs uppercase tracking-wide text-ink-soft">
              $4.99 one time · not a subscription
            </span>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
