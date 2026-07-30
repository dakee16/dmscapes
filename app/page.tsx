import Link from "next/link";
import Nav from "@/components/Nav";
import RoomPlanner from "@/components/RoomPlanner";
import HowItWorks from "@/components/HowItWorks";
import Vibes from "@/components/Vibes";
import Schools from "@/components/Schools";
import PlusPitch from "@/components/site/PlusPitch";
import Footer from "@/components/Footer";
import Reveal from "@/components/site/Reveal";
import CursorGrid from "@/components/site/CursorGrid";
import HeroParallax from "@/components/site/HeroParallax";

export default function Home() {
  return (
    <div id="top">
      <Nav />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="grid-paper grid-paper-fade absolute inset-0 -z-10" aria-hidden="true">
            <CursorGrid />
          </div>
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28">
            <div>
              <p className="rise font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
                Free AI dorm planner · Fall &rsquo;26
              </p>
              <h1
                className="rise mt-4 font-display text-[2.6rem] font-extrabold leading-[1.04] tracking-tight sm:text-6xl"
                style={{ animationDelay: "80ms" }}
              >
                Your dorm, planned
                <br />
                <span className="hl">to the inch.</span>
              </h1>
              <p
                className="rise mt-5 max-w-md text-lg leading-relaxed text-ink-soft"
                style={{ animationDelay: "160ms" }}
              >
                Pick your school, choose a vibe, set a budget. Dormscape knows your
                exact room and hands you a layout plus a shoppable Amazon list, before
                you ever get the keys.
              </p>
              <div className="rise mt-8" style={{ animationDelay: "240ms" }}>
                <Link
                  href="/plan"
                  className="inline-flex h-14 items-center rounded-xl bg-cobalt px-8 text-lg font-semibold text-white shadow-[0_14px_32px_-14px_rgba(43,78,255,0.6)] transition-all hover:-translate-y-0.5 hover:bg-cobalt-deep"
                >
                  Plan my room for free
                </Link>
                <p className="mt-3 text-sm text-ink-soft">
                  No account needed. Most rooms take under a minute.
                </p>
              </div>
              <ul
                className="rise mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft"
                style={{ animationDelay: "320ms" }}
              >
                <li>16 schools preloaded, more weekly</li>
                <li>$200-$1,500 budgets</li>
                <li>Live Amazon links</li>
              </ul>

              {/* Secondary, benefit-forward Plus teaser. Deliberately lighter
                  than the primary CTA: muted card, small type, added-value
                  framing (no gating or scarcity language). */}
              <Link
                href="/pricing"
                aria-label="See what Dormscape Plus adds"
                className="rise group mt-6 flex w-full max-w-sm items-center gap-3 rounded-xl border border-ink/10 bg-white/60 px-4 py-2.5 transition-colors hover:border-cobalt/40 hover:bg-white"
                style={{ animationDelay: "400ms" }}
              >
                <span className="flex shrink-0 items-center gap-2 text-cobalt" aria-hidden="true">
                  {/* unlimited saves */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[17px] w-[17px]">
                    <rect x="8" y="8" width="12" height="12" rx="2" />
                    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {/* PDF export */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[17px] w-[17px]">
                    <path d="M12 3v10m0 0l-3.2-3.2M12 13l3.2-3.2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M5 16v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {/* side-by-side comparison */}
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-[17px] w-[17px]">
                    <rect x="3.5" y="5" width="7" height="14" rx="1.5" />
                    <rect x="13.5" y="5" width="7" height="14" rx="1.5" />
                  </svg>
                </span>
                <span className="text-[13px] leading-snug text-ink-soft">
                  Torn between two looks?{" "}
                  <span className="font-semibold text-ink">Plus</span> saves and
                  compares them side by side.
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto h-4 w-4 shrink-0 text-cobalt transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                  <path d="M5 12h14m0 0l-5-5m5 5l-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
            <HeroParallax className="flex justify-center lg:justify-end">
              <RoomPlanner />
            </HeroParallax>
          </div>
        </section>

        <HowItWorks />

        {/* Mid-scroll CTA: the obvious next action */}
        <section className="mx-auto max-w-6xl px-5 pb-20 sm:px-8 sm:pb-28">
          <Reveal>
            <div className="relative overflow-hidden rounded-2xl bg-ink px-6 py-12 text-center sm:px-12 sm:py-16">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.07]"
                style={{
                  backgroundImage:
                    "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                }}
                aria-hidden="true"
              />
              <p className="relative font-mono text-xs font-medium uppercase tracking-[0.18em] text-highlight">
                That&rsquo;s the whole thing
              </p>
              <h2 className="relative mx-auto mt-3 max-w-2xl font-display text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Three steps between you and a room that actually works.
              </h2>
              <div className="relative mt-8">
                <Link
                  href="/plan"
                  className="inline-flex h-14 items-center rounded-xl bg-highlight px-8 text-lg font-semibold text-ink transition-all hover:-translate-y-0.5 hover:bg-white"
                >
                  Plan my room for free
                </Link>
              </div>
              <p className="relative mt-4 font-mono text-[11px] uppercase tracking-wide text-white/60">
                Free · No account · Under a minute
              </p>
            </div>
          </Reveal>
        </section>

        <Vibes />
        <Schools />

        {/* Plus pitch: distinct light treatment, between the showcase and the
            final closing CTA. */}
        <PlusPitch />

        {/* Bottom CTA */}
        <section className="bg-cobalt">
          <div className="relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.12]"
              style={{
                backgroundImage:
                  "linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
              aria-hidden="true"
            />
            <Reveal className="relative mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-24">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-highlight">
                Move-in is in August
              </p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Everyone else is winging it.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/80">
                Show up with a plan instead of three carts of guesses. Pick your
                school, set your budget, and see your exact room. Free.
              </p>
              <div className="mt-8">
                <Link
                  href="/plan"
                  className="inline-flex h-14 items-center rounded-xl bg-white px-8 text-lg font-semibold text-ink transition-colors hover:bg-highlight"
                >
                  Plan my room for free
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
