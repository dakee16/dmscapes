import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";

// Structural draft reflecting Dormscape's actual use of cookies and browser
// storage (Supabase session, planner state, PostHog analytics) as of this
// writing. Have a legal professional (or a service like Termly/iubenda)
// review this before treating it as final, binding legal text, especially
// before scaling to meaningful user volume.

export const metadata: Metadata = {
  title: "Cookie Policy",
  description:
    "Dormscape's cookie policy: the sign-in session, planner progress, and PostHog analytics cookies we use, in plain language.",
};

const TEXT_LINK =
  "font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt";

export default function CookiesPage() {
  return (
    <div>
      <Nav />
      <main>
        <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink-soft">
            Legal
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
            Cookie Policy
          </h1>
          <p className="mt-2 font-mono text-sm text-ink-soft">
            Last updated: July 23, 2026
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Cookies are small pieces of data a site stores in your browser. Dormscape
            uses a small number of them, plus some similar browser storage like local
            storage, and this page explains what each one does. Nothing here is used
            to track you across other websites for advertising.
          </p>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Necessary
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              These keep the basic site working.
            </p>
            <ul className="mt-4 space-y-4 text-base leading-relaxed text-ink-soft">
              <li>
                <span className="font-semibold text-ink">Sign-in session.</span>{" "}If you
                create an account, your sign-in session is kept in your browser&rsquo;s
                local storage so you stay signed in between visits. This isn&rsquo;t a
                traditional cookie, but it does the same job. Without it, you&rsquo;d have
                to sign in again every time.
              </li>
              <li>
                <span className="font-semibold text-ink">Planner progress.</span>{" "}As you
                move through picking a school, dorm, style, and budget, your
                in-progress choices are held in your browser&rsquo;s session storage so
                you don&rsquo;t lose them switching between steps. This clears when you
                close the tab.
              </li>
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Analytics
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Dormscape uses PostHog to see how the site is used: which pages get
              visited and which buttons get clicked. PostHog sets its own cookies and
              local storage entries to recognize repeat visits during a session. We use
              this in aggregate, to find what&rsquo;s confusing or broken, not to build a
              profile of you individually.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              What we don&rsquo;t use
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              No advertising or ad-retargeting cookies. No selling of cookie data to
              third parties. No cross-site tracking.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Managing cookies
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              You can clear or block cookies and local storage through your browser&rsquo;s
              settings at any time. Blocking them may sign you out or reset an
              in-progress room plan, since those are exactly what the necessary
              category above is for.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Changes to this policy
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              We may update this policy as Dormscape changes. We&rsquo;ll update the date
              at the top when we do.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Questions
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Questions about cookies? Email{" "}
              <a href="mailto:info@dormscape.us" className={TEXT_LINK}>
                info@dormscape.us
              </a>
              .
            </p>
          </section>

          <div className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink/10 pt-8 text-sm">
            <Link href="/terms" className={TEXT_LINK}>
              Terms of Service
            </Link>
            <Link href="/privacy" className={TEXT_LINK}>
              Privacy Policy
            </Link>
            <Link href="/" className={TEXT_LINK}>
              Back to Dormscape
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
