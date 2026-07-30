import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import { POSTS } from "@/content/blog";
import { faqPageJsonLd } from "@/lib/blog";

const DESCRIPTION =
  "Answers to common dorm questions: how to measure your room, what to pack, what it costs, small-room layouts, and choosing a style.";

export const metadata: Metadata = {
  title: "FAQ",
  description: DESCRIPTION,
  alternates: { canonical: "/faq" },
  openGraph: {
    title: "Dorm FAQ",
    description: DESCRIPTION,
    siteName: "Dormscape",
    type: "website",
    url: "/faq",
    images: [
      {
        url: "/og.png",
        width: 1200,
        height: 630,
        alt: "Dormscape, the free AI dorm room planner",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Dorm FAQ",
    description: DESCRIPTION,
    images: ["/og.png"],
  },
};

// Each post contributes a topic group. The /faq page is the single home for FAQ
// content and the FAQPage structured data now that posts are FAQ-free.
const GROUPS = POSTS.filter((p) => p.faqs && p.faqs.length > 0).map((p) => ({
  topic: p.faqTopic ?? p.title,
  slug: p.slug,
  title: p.title,
  faqs: p.faqs ?? [],
}));

export default function FAQPage() {
  const jsonLd = faqPageJsonLd(GROUPS.flatMap((g) => g.faqs));

  return (
    <div>
      <Nav />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <main className="relative">
        <div
          className="grid-paper grid-paper-fade absolute inset-x-0 top-0 -z-10 h-[24rem]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-[50rem] px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            Frequently asked questions
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Dorm questions, <span className="hl">answered.</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            The short answers to what people ask most about setting up a dorm
            room. Each one links out to the full guide if you want the detail.
          </p>

          {/* Topic jump links */}
          <nav aria-label="FAQ topics" className="mt-8 flex flex-wrap gap-2">
            {GROUPS.map((g) => (
              <a
                key={g.slug}
                href={`#faq-${g.slug}`}
                className="rounded-full border border-ink/10 bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-soft transition-colors hover:border-cobalt/40 hover:text-cobalt"
              >
                {g.topic}
              </a>
            ))}
          </nav>

          <div className="mt-12 space-y-14">
            {GROUPS.map((g) => (
              <section key={g.slug} id={`faq-${g.slug}`} className="scroll-mt-24">
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[1.7rem]">
                    {g.topic}
                  </h2>
                  <Link
                    href={`/blog/${g.slug}`}
                    className="font-mono text-[11px] uppercase tracking-wide text-cobalt transition-colors hover:text-cobalt-deep"
                  >
                    Read the guide
                  </Link>
                </div>
                <div className="mt-5 divide-y divide-ink/8">
                  {g.faqs.map((f) => (
                    <div key={f.q} className="py-5 first:pt-0">
                      <h3 className="font-display text-lg font-bold tracking-tight text-ink">
                        {f.q}
                      </h3>
                      <p className="mt-2 text-base leading-relaxed text-ink-soft">
                        {f.a}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-14 rounded-xl border border-dashed border-ink/20 bg-card/60 p-6 text-center">
            <p className="font-medium text-ink">
              Still have a question about your room?
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-3">
              <Link
                href="/plan"
                className="inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
              >
                Plan my room for free
              </Link>
              <Link
                href="/contact"
                className="inline-block rounded-lg border border-ink/15 px-5 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-cobalt/50 hover:text-cobalt"
              >
                Contact us
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
