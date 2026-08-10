import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import PostCard from "@/components/blog/PostCard";
import { POSTS } from "@/content/blog";
import { BLOG_BASE } from "@/lib/blog";

const DESCRIPTION =
  "Practical, specific guides to planning a dorm room: how to measure it, what to pack, what it costs, small-room ideas, and how to pick a style.";

export const metadata: Metadata = {
  title: "Blog",
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
        url: "/og.png",
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
    images: ["/og.png"],
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
      datePublished: p.date,
      dateModified: p.updated ?? p.date,
    })),
  };

  return (
    <div>
      <SiteHeader gridClassName="h-[24rem]" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <main className="relative">
        <div className="mx-auto max-w-5xl px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            The dormscape Blog
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            Dorm planning, <span className="hl">figured out.</span>
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-ink-soft">
            Specific, useful guides to setting up a dorm room the right way:
            measuring the space, packing what matters, budgeting honestly, and
            making a small room work.
          </p>

          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {POSTS.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
