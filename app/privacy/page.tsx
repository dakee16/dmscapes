import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";

// Structural draft reflecting Dormscape's actual data flows (Supabase,
// PostHog, Amazon Associates, Google OAuth) as of this writing. Have a legal
// professional (or a service like Termly/iubenda) review this before
// treating it as final, binding legal text, especially before scaling to
// meaningful user volume.

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Dormscape's privacy policy: what account, design, and usage data we collect, how it's stored, and how to delete your data.",
};

const TEXT_LINK =
  "font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt";

export default function PrivacyPage() {
  return (
    <div>
      <Nav />
      <main>
        <div className="mx-auto max-w-3xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink-soft">
            Legal
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 font-mono text-sm text-ink-soft">
            Last updated: July 23, 2026
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            This page explains what information Dormscape collects, why, and what you
            can do about it. The short version: we collect what we need to run the
            planner and understand what&rsquo;s working, we don&rsquo;t sell your data, and
            you can ask us to delete your account at any time.
          </p>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Information we collect
            </h2>
            <ul className="mt-4 space-y-4 text-base leading-relaxed text-ink-soft">
              <li>
                <span className="font-semibold text-ink">Account information.</span>{" "}If
                you create an account, we store your email address and the username you
                choose. You can sign in with an email and password, or with Google. If
                you use Google, we receive your email address from Google; we don&rsquo;t
                see your Google password.
              </li>
              <li>
                <span className="font-semibold text-ink">Saved room designs.</span>{" "}When
                you save a room, we store the school, dorm, and room type you picked,
                your chosen style and budget, your furniture layout, and any product
                swaps you made. This is what lets you come back and reload a saved
                design.
              </li>
              <li>
                <span className="font-semibold text-ink">
                  Purchase surveys and feedback.
                </span>{" "}
                After you shop a design, we may ask whether you actually made a
                purchase and, if you&rsquo;re willing, a star rating and short written
                feedback. Beyond the initial yes, no, or still deciding response, these
                are optional and not required to use the planner.
              </li>
              <li>
                <span className="font-semibold text-ink">Analytics.</span>{" "}We use
                PostHog to understand how people use Dormscape: which pages get
                visited, which buttons get clicked, and where people drop off in the
                planning flow. This is aggregate usage data (page views and click
                events), not the content of anything you type.
              </li>
            </ul>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              How we use it
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              We use this information to run the planner (saving and reloading your
              designs), to understand which parts of the product work and which
              don&rsquo;t, and to respond if you send us feedback. We don&rsquo;t use your
              data to build advertising profiles, and we don&rsquo;t sell it.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Where your data lives
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Dormscape&rsquo;s data is stored with Supabase, a hosted database and
              authentication provider. Access to raw data is restricted. The app in
              your browser never talks to the database directly; it goes through our
              server, which checks who&rsquo;s asking before returning anything.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Who else sees it
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              A few outside services are part of how Dormscape works:
            </p>
            <ul className="mt-4 space-y-3 text-base leading-relaxed text-ink-soft">
              <li>
                <span className="font-semibold text-ink">Supabase</span>{" "}hosts our
                database and handles account sign-in.
              </li>
              <li>
                <span className="font-semibold text-ink">Google</span>{" "}handles
                authentication if you choose to sign in with Google. We only receive
                the email address associated with your Google account.
              </li>
              <li>
                <span className="font-semibold text-ink">PostHog</span>{" "}processes the
                anonymized usage analytics described above.
              </li>
              <li>
                <span className="font-semibold text-ink">Amazon Associates</span>{" "}is our
                affiliate partner. When you click a product link, Amazon&rsquo;s own
                tracking, not Dormscape&rsquo;s, attributes the resulting purchase to us
                for the commission. What Amazon does with that click is governed by
                Amazon&rsquo;s own privacy policy.
              </li>
            </ul>
            <p className="mt-4 text-base leading-relaxed text-ink-soft">
              None of these partners get your data to sell or use for their own
              advertising. They process it as part of making Dormscape work.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Your rights
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              You can ask us to delete your account and the data tied to it at any
              time. Email{" "}
              <a href="mailto:info@dormscape.us" className={TEXT_LINK}>
                info@dormscape.us
              </a>{" "}
              and we&rsquo;ll take care of it. If you never created an account, most of
              your planner data (your in-progress room selections) lives only in your
              browser and clears when you clear your browser storage.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              We don&rsquo;t sell your data
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Dormscape does not sell your personal information to third parties, full
              stop.
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
              Questions about your data? Email{" "}
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
            <Link href="/cookies" className={TEXT_LINK}>
              Cookie Policy
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
