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
import HomeFaq from "@/components/site/HomeFaq";

export default function Home() {
  return (
    <div id="top">
      <Nav />
      <main>
        {/* Hero. The negative top margin pulls the section up behind the sticky
            header while the matching top padding keeps the content in place, so
            the graph-paper layer (inset-0) runs continuously behind and above
            the floating header instead of stopping below it. */}
        <section className="relative -mt-[72px] overflow-hidden pt-[72px] sm:-mt-[84px] sm:pt-[84px]">
          <div className="grid-paper grid-paper-fade absolute inset-0 -z-10" aria-hidden="true">
            <CursorGrid />
          </div>
          {/* Ambient depth: soft brand-tinted blooms over the grid, behind the
              content, so the hero reads with more presence than a flat page. */}
          <div
            className="pointer-events-none absolute -right-28 -top-20 -z-10 h-[36rem] w-[36rem] rounded-full bg-cobalt/[0.09] blur-[110px]"
            aria-hidden="true"
          />
          <div
            className="pointer-events-none absolute -left-24 top-48 -z-10 h-80 w-80 rounded-full bg-highlight/25 blur-[100px]"
            aria-hidden="true"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28">
            <div>
              <span className="rise inline-flex items-center gap-2 rounded-full border border-cobalt/20 bg-cobalt/[0.06] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cobalt">
                <span className="h-1.5 w-1.5 rounded-full bg-cobalt" aria-hidden="true" />
                Free AI dorm planner · Fall &rsquo;26
              </span>
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
                  className="inline-flex h-14 items-center rounded-xl bg-cobalt px-8 text-lg font-semibold text-white shadow-[0_14px_32px_-14px_rgba(43,78,255,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-cobalt-deep hover:shadow-[0_20px_40px_-16px_rgba(43,78,255,0.7)] active:translate-y-0"
                >
                  Plan my room for free
                </Link>
                <p className="mt-3 text-sm text-ink-soft">
                  No account needed. Most rooms take under a minute.
                </p>
                <p className="mt-3 flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-wide text-ink-soft">
                  <span className="h-1.5 w-1.5 rounded-full bg-cobalt" aria-hidden="true" />
                  200+ rooms planned and counting
                </p>
              </div>
              <ul
                className="rise mt-6 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft"
                style={{ animationDelay: "320ms" }}
              >
                <li>1,000+ dorm layouts</li>
                <li>$200-$1,500 budgets</li>
                <li>Live Amazon links</li>
              </ul>

              {/* Secondary, benefit-forward Plus teaser. Deliberately lighter
                  than the primary CTA: muted card, small type, added-value
                  framing (no gating or scarcity language). */}
              <Link
                href="/pricing"
                aria-label="See what Dormscape Plus adds"
                className="rise group mt-5 flex w-full max-w-sm items-center gap-3 rounded-xl border border-ink/10 bg-white/60 px-4 py-2.5 transition-colors hover:border-cobalt/40 hover:bg-white"
                style={{ animationDelay: "400ms" }}
              >
                <span className="flex shrink-0 items-center gap-2 text-cobalt" aria-hidden="true">
                  {/* all vibes */}
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
                  <span className="font-semibold text-ink">Plus</span> compares
                  them side by side and unlocks every vibe.
                </span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="ml-auto h-4 w-4 shrink-0 text-cobalt transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                  <path d="M5 12h14m0 0l-5-5m5 5l-5 5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
            <HeroParallax className="flex justify-center lg:justify-end">
              {/* Slow idle float + faint breathe (see .hero-float in
                  globals.css), layered under the scroll parallax so the preview
                  feels gently alive. Reduced-motion pauses it. */}
              <div className="hero-float">
                <RoomPlanner />
              </div>
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
                  className="inline-flex h-14 items-center rounded-xl bg-highlight px-8 text-lg font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:bg-white active:translate-y-0"
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

        {/* FAQ: replaces the old duplicate closing CTA. Product-level questions
            in an accordion; the full dorm-advice FAQ lives at /faq. */}
        <section className="relative overflow-hidden border-t border-ink/8">
          <div
            className="grid-paper grid-paper-fade absolute inset-x-0 top-0 -z-10 h-[22rem]"
            aria-hidden="true"
          />
          <div className="mx-auto max-w-3xl px-5 py-20 sm:px-8 sm:py-24">
            <Reveal className="text-center">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
                Frequently asked
              </p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-4xl">
                Questions, <span className="hl">answered.</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-ink-soft">
                The short version of what people ask most. Tap any question to
                open it.
              </p>
            </Reveal>

            <Reveal className="mt-10">
              <HomeFaq />
            </Reveal>

            <p className="mt-8 text-center text-sm text-ink-soft">
              Still curious?{" "}
              <Link
                href="/faq"
                className="font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-2 transition-colors hover:text-cobalt"
              >
                Read the full FAQ
              </Link>{" "}
              or{" "}
              <Link
                href="/contact"
                className="font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-2 transition-colors hover:text-cobalt"
              >
                get in touch
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
