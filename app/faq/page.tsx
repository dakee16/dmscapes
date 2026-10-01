import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import CtaBand from "@/components/ds/CtaBand";
import { ArrowRight } from "@/components/ds/Icons";
import PlanCta from "@/components/site/PlanCta";
import JsonLd from "@/components/site/JsonLd";
import { FaqBrowser, FaqProvider, FaqSearch, type FaqGroup } from "@/components/faq/FaqExplorer";
import { topicOf } from "@/components/blog/topics";
import { POSTS } from "@/content/blog";
import { faqPageJsonLd } from "@/lib/blog";
import css from "@/components/faq/Faq.module.css";

const DESCRIPTION =
  "Dorm planning answers: room measurements, budgets, styles, and Pro 3D room building. Learn to draw walls, add doors and windows, and furnish your room in 3D.";

export const metadata: Metadata = {
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
        url: "/og.png?v=folded-room",
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
    images: ["/og.png?v=folded-room"],
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

// Display order: the everyday questions first, the paid tools after. Topics
// not listed keep their place at the end, so a new post's FAQs still show.
const ORDER = [
  "Planning a dorm room",
  "Measuring your room",
  "Budget and cost",
  "Dorm room layouts",
  "Small and awkward rooms",
  "Style",
  "Packing",
  "Shared shopping",
  "Plus",
  "Comparing",
  "My rooms and roommates",
  "Draw your own room",
  "Create your own vibe",
  "3D Room Builder",
  "Irregular rooms",
  "3D Room Studio",
  "Arranging in 3D",
];
const rank = (topic: string) => {
  const i = ORDER.indexOf(topic);
  return i === -1 ? ORDER.length : i;
};

export default function FAQPage() {
  const jsonLd = faqPageJsonLd(GROUPS.flatMap((g) => g.faqs));

  // Array sort is stable, so unlisted topics keep their live order.
  const shown: FaqGroup[] = [...GROUPS]
    .sort((a, b) => rank(a.topic) - rank(b.topic))
    .map((g) => {
      const post = POSTS.find((p) => p.slug === g.slug);
      const tone: FaqGroup["tone"] =
        post?.faqTopic === "Plus" ? "ink" : post && topicOf(post)?.id === "3d" ? "night" : "white";
      return { ...g, tone };
    });
  const total = GROUPS.reduce((n, g) => n + g.faqs.length, 0);

  return (
    <PageShell navOverlay>
      <JsonLd data={jsonLd} />
      <FaqProvider>
        <PageHero
          bg="var(--ds-sky)"
          size="md"
          className={css.hero}
          eyebrow={
            <>
              FAQ · {total} questions · {GROUPS.length} topics
            </>
          }
          lines={[
            { text: "Dorm questions,", riso: true },
            { text: "answered.", serif: true },
          ]}
          lede={
            <p>
              The short answers to what people ask most about setting up a dorm
              room. Each one links out to the full guide if you want the detail.
            </p>
          }
        >
          <FaqSearch total={total} />
        </PageHero>

        <section className={css.section} aria-label="Questions">
          <FaqBrowser groups={shown} />
        </section>
      </FaqProvider>

      <CtaBand
        lead="Still have a question"
        tail="about your room?"
        note={
          <a href="mailto:info@dormscape.us" className={css.mail}>
            info@dormscape.us
          </a>
        }
      >
        <Link href="/contact" className="ds-btn ds-btn--yellow ds-btn--lg">
          Contact us
          <ArrowRight />
        </Link>
        <PlanCta className="ds-btn ds-btn--ghost" icon={<ArrowRight />} />
      </CtaBand>
    </PageShell>
  );
}
