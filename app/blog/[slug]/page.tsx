import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Nav from "@/components/Nav";
import { getPost, allPostSlugs, POSTS } from "@/content/blog";
import { articleJsonLd, formatBlogDate } from "@/lib/blog";

// Prebuild every post at build time; unknown slugs 404.
export function generateStaticParams() {
  return allPostSlugs().map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const post = getPost(slug);
  if (!post) return {};
  const url = `/blog/${post.slug}`;
  return {
    title: post.metaTitle ?? post.title,
    description: post.description,
    alternates: { canonical: url },
    openGraph: {
      title: post.metaTitle ?? post.title,
      description: post.description,
      siteName: "Dormscape",
      type: "article",
      url,
      publishedTime: post.date,
      modifiedTime: post.updated ?? post.date,
      authors: ["Dormscape"],
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
      title: post.metaTitle ?? post.title,
      description: post.description,
      images: ["/og.png"],
    },
  };
}

export default async function BlogPostPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const post = getPost(slug);
  if (!post) notFound();

  const { Body } = post;
  const updated = post.updated ?? post.date;
  const jsonLd = articleJsonLd(post);
  // Two other posts to surface at the foot for internal linking.
  const more = POSTS.filter((p) => p.slug !== post.slug).slice(0, 2);

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
          className="grid-paper grid-paper-fade absolute inset-x-0 top-0 -z-10 h-[22rem]"
          aria-hidden="true"
        />
        <article className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-soft transition-colors hover:text-cobalt"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M13 8H3M7 4L3 8l4 4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            All posts
          </Link>

          <div className="mt-6 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-cobalt">
            <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.readingTimeMin} min read</span>
          </div>

          <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl">
            {post.title}
          </h1>

          <p className="mt-4 text-sm text-ink-soft">
            By <span className="font-semibold text-ink">Dormscape</span>
            {updated !== post.date && <> · Updated {formatBlogDate(updated)}</>}
          </p>

          <Body />

          <div className="mt-16 border-t border-ink/8 pt-10">
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              Keep reading
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {more.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="group block rounded-xl border border-ink/10 bg-card p-5 transition-colors hover:border-cobalt/40"
                >
                  <h3 className="font-display text-base font-bold tracking-tight text-ink transition-colors group-hover:text-cobalt">
                    {p.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                    {p.excerpt}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </article>
      </main>
    </div>
  );
}
