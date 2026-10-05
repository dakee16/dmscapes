import type { Metadata } from "next";
import PageShell from "@/components/ds/PageShell";
import Headline from "@/components/ds/Headline";
import JsonLd from "@/components/site/JsonLd";
import BlogBrowser from "@/components/blog/BlogBrowser";
import { TOPICS, summarize } from "@/components/blog/topics";
import { POSTS } from "@/content/blog";
import { BLOG_BASE, isoDateTime } from "@/lib/blog";
import css from "@/components/blog/Blog.module.css";

const DESCRIPTION =
  "Practical, specific guides to planning a dorm room: how to measure it, what to pack, what it costs, small-room ideas, and how to pick a style.";

export const metadata: Metadata = {
  title: "Dorm Room Planning Guides",
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "The dormscape Blog",
    description: DESCRIPTION,
    siteName: "Dormscape",
    type: "website",
    url: "/blog",
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
    title: "The dormscape Blog",
    description: DESCRIPTION,
    images: ["/og.png?v=folded-room"],
  },
};

export default function BlogIndexPage() {
  // Blog + ItemList JSON-LD so search and AI engines can see the full set of
  // posts and their dates from one page.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "The dormscape Blog",
    description: DESCRIPTION,
    url: `${BLOG_BASE}/blog`,
    publisher: { "@type": "Organization", name: "Dormscape", url: BLOG_BASE },
    blogPost: POSTS.map((p) => ({
      "@type": "BlogPosting",
      headline: p.title,
      description: p.description,
      url: `${BLOG_BASE}/blog/${p.slug}`,
      datePublished: isoDateTime(p.date),
      dateModified: isoDateTime(p.updated ?? p.date),
    })),
  };

  const posts = POSTS.map(summarize);
  // Only topics that actually have guides get a filter.
  const topics = TOPICS.filter((t) => posts.some((p) => p.topic === t.id)).map(({ id, label }) => ({ id, label }));

  return (
    <PageShell navOverlay>
      <JsonLd data={jsonLd} />
      <header className={css.hero} aria-labelledby="page-title">
        <div className={`ds-wrap ${css.heroGrid}`}>
          <div>
            <p className={`ds-eyebrow ${css.eyebrow}`} data-reveal="load">
              The Dormscape blog · {POSTS.length} guides
            </p>
            <Headline
              as="h1"
              id="page-title"
              load
              delayMs={60}
              className={`ds-h1 ${css.title}`}
              lines={[
                { text: "Dorm planning, ", riso: true },
                { text: "figured out.", serif: true },
              ]}
            />
          </div>
          <div className={css.heroAside} data-reveal="load" style={{ "--i": 3 } as React.CSSProperties}>
            <p className="ds-lede">
              Specific, useful guides to setting up a dorm room the right way:
              measuring the space, packing what matters, budgeting honestly, and
              making a small room work.
            </p>
            <p className={css.motto}>
              Measure. Imagine. Make room.
              <br />
              A little room. Infinite possibility.
            </p>
          </div>
        </div>
      </header>
      <BlogBrowser posts={posts} topics={topics} />
    </PageShell>
  );
}
