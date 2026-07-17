import Nav from "@/components/Nav";
import RoomPlanner from "@/components/RoomPlanner";
import WaitlistForm from "@/components/WaitlistForm";
import HowItWorks from "@/components/HowItWorks";
import Vibes from "@/components/Vibes";
import Schools from "@/components/Schools";

export default function Home() {
  return (
    <div id="top">
      <Nav />
      <main>
        {/* ——— Hero ——— */}
        <section className="grid-paper grid-paper-fade relative overflow-hidden">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 sm:pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8 lg:pb-28">
            <div>
              <p className="rise font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
                Free AI dorm planner — Fall &rsquo;26
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
                exact room and hands you a layout plus a shoppable list from Amazon and
                Target — before you ever get the keys.
              </p>
              <div id="waitlist" className="rise mt-8 max-w-md scroll-mt-24" style={{ animationDelay: "240ms" }}>
                <WaitlistForm id="waitlist-hero" source="hero" />
                <p className="mt-3 text-sm text-ink-soft">
                  Free for students. The first 1,000 signups get their room plan on
                  launch day.
                </p>
              </div>
              <ul
                className="rise mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft"
                style={{ animationDelay: "320ms" }}
              >
                <li>50+ schools preloaded</li>
                <li>$200–$1,500 budgets</li>
                <li>Amazon + Target links</li>
              </ul>
            </div>
            <div className="flex justify-center lg:justify-end">
              <RoomPlanner />
            </div>
          </div>
        </section>

        <HowItWorks />
        <Vibes />
        <Schools />

        {/* ——— Bottom CTA ——— */}
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
            <div className="relative mx-auto max-w-3xl px-5 py-20 text-center sm:px-8 sm:py-24">
              <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-highlight">
                Move-in is in August
              </p>
              <h2 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
                Everyone else is winging it.
              </h2>
              <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-white/80">
                Show up with a plan instead of three carts of guesses. Join the waitlist
                and get your room the day we launch.
              </p>
              <div className="mx-auto mt-8 max-w-md">
                <WaitlistForm id="waitlist-bottom" source="bottom-cta" variant="dark" />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ——— Footer ——— */}
      <footer className="border-t border-ink/8 bg-paper">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <p className="font-display text-lg font-bold tracking-tight">dormscape</p>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              Made for freshmen. Free forever.
            </p>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-ink-soft">
            <a href="https://instagram.com" className="transition-colors hover:text-ink">
              Instagram
            </a>
            <a href="https://tiktok.com" className="transition-colors hover:text-ink">
              TikTok
            </a>
            <a href="mailto:hello@dormscape.com" className="transition-colors hover:text-ink">
              Contact
            </a>
          </div>
          <p className="text-xs text-ink-soft">© 2026 Dormscape</p>
        </div>
      </footer>
    </div>
  );
}
