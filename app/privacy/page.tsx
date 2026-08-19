import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";

// Structural draft reflecting Dormscape's actual data flows (Supabase,
// PostHog, Amazon Associates, Google OAuth) as of this writing. Have a legal
// professional (or a service like Termly/iubenda) review this before
// treating it as final, binding legal text, especially before scaling to
// meaningful user volume.
//
// PRESENTATION NOTE: the TOC, section numbers, and "short version" summary box
// are navigation/structure only. The legal text below is unchanged.

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Dormscape's privacy policy: what account, design, and usage data we collect, how it's stored, and how to delete your data.",
};

const TEXT_LINK =
  "font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt";

const H2 = "font-display text-2xl font-bold tracking-tight";
const P = "mt-3 text-base leading-relaxed text-ink-soft";

const SECTIONS = [
  { id: "information-we-collect", title: "Information we collect" },
  { id: "how-we-use-it", title: "How we use it" },
  { id: "where-your-data-lives", title: "Where your data lives" },
  { id: "who-else-sees-it", title: "Who else sees it" },
  { id: "your-rights", title: "Your rights" },
  { id: "dont-sell", title: "We don't sell your data" },
  { id: "changes", title: "Changes to this policy" },
  { id: "questions", title: "Questions" },
] as const;

// Plain-language recap. Accurate restatement of the sections below; sits
// alongside the full text and does not replace it.
const SUMMARY = [
  "We collect what's needed to run the planner: your email and username if you make an account, your saved designs, optional feedback, and aggregate usage analytics.",
  "We don't sell your data, and we don't build advertising profiles.",
  "Your data is stored with Supabase; the app reaches it only through our server.",
  "A few services help run Dormscape: Supabase (database and sign-in), Google (optional sign-in), PostHog (analytics), and Amazon (affiliate links).",
  "You can ask us to delete your account and its data at any time by emailing info@dormscape.us.",
];

function SectionHeading({ n, title }: { n: number; title: string }) {
  return (
    <h2 className={H2}>
      <span className="mr-2 font-mono text-lg font-semibold text-cobalt">{n}.</span>
      {title}
    </h2>
  );
}

export default function PrivacyPage() {
  return (
    <div>
      <SiteHeader gridClassName="h-[20rem]" />
      <main>
        <div className="mx-auto max-w-[50rem] px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink-soft">
            Legal
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-card px-3 py-1 font-mono text-xs font-medium uppercase tracking-wide text-ink-soft">
            <span className="h-1.5 w-1.5 rounded-full bg-cobalt" aria-hidden="true" />
            Last updated: July 23, 2026
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            This page explains what information Dormscape collects, why, and what you
            can do about it. The short version: we collect what we need to run the
            planner and understand what&rsquo;s working, we don&rsquo;t sell your data, and
            you can ask us to delete your account at any time.
          </p>

          {/* Plain-language summary box (sits alongside the full text). */}
          <aside className="mt-8 rounded-2xl border border-cobalt/20 bg-cobalt/[0.04] p-5 sm:p-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cobalt">
              The short version
            </p>
            <p className="mt-1 text-sm text-ink-soft">
              A plain-language recap, not a substitute for the full policy below.
            </p>
            <ul className="mt-4 space-y-2.5">
              {SUMMARY.map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-sm leading-snug text-ink">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-cobalt" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
                    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {s}
                </li>
              ))}
            </ul>
          </aside>

          {/* Table of contents. */}
          <nav aria-label="Contents" className="mt-8 rounded-2xl border border-ink/10 bg-card p-5 sm:p-6">
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-soft">
              Contents
            </p>
            <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {SECTIONS.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="group flex gap-2 text-sm text-ink-soft transition-colors hover:text-cobalt">
                    <span className="font-mono text-ink-soft/70 group-hover:text-cobalt">{i + 1}.</span>
                    <span className="underline-offset-2 group-hover:underline">{s.title}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          {/* ---- Full legal text (verbatim) ---- */}

          <section id="information-we-collect" className="mt-14 scroll-mt-24">
            <SectionHeading n={1} title="Information we collect" />
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

          <section id="how-we-use-it" className="mt-14 scroll-mt-24">
            <SectionHeading n={2} title="How we use it" />
            <p className={P}>
              We use this information to run the planner (saving and reloading your
              designs), to understand which parts of the product work and which
              don&rsquo;t, and to respond if you send us feedback. We don&rsquo;t use your
              data to build advertising profiles, and we don&rsquo;t sell it.
            </p>
          </section>

          <section id="where-your-data-lives" className="mt-14 scroll-mt-24">
            <SectionHeading n={3} title="Where your data lives" />
            <p className={P}>
              Dormscape&rsquo;s data is stored with Supabase, a hosted database and
              authentication provider. Access to raw data is restricted. The app in
              your browser never talks to the database directly; it goes through our
              server, which checks who&rsquo;s asking before returning anything.
            </p>
          </section>

          <section id="who-else-sees-it" className="mt-14 scroll-mt-24">
            <SectionHeading n={4} title="Who else sees it" />
            <p className={P}>
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

          <section id="your-rights" className="mt-14 scroll-mt-24">
            <SectionHeading n={5} title="Your rights" />
            <p className={P}>
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

          <section id="dont-sell" className="mt-14 scroll-mt-24">
            <SectionHeading n={6} title="We don't sell your data" />
            <p className={P}>
              Dormscape does not sell your personal information to third parties, full
              stop.
            </p>
          </section>

          <section id="changes" className="mt-14 scroll-mt-24">
            <SectionHeading n={7} title="Changes to this policy" />
            <p className={P}>
              We may update this policy as Dormscape changes. We&rsquo;ll update the date
              at the top when we do.
            </p>
          </section>

          <section id="questions" className="mt-14 scroll-mt-24">
            <SectionHeading n={8} title="Questions" />
            <p className={P}>
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
