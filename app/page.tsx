import Link from "next/link";
import Nav from "@/components/Nav";
import RoomPlanner from "@/components/RoomPlanner";
import HowItWorks from "@/components/HowItWorks";
import Vibes from "@/components/Vibes";
import Schools from "@/components/Schools";
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
                <li>12 schools preloaded, more weekly</li>
                <li>$200–$1,500 budgets</li>
                <li>Live Amazon links</li>
              </ul>
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
