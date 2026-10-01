import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import PageShell from "@/components/ds/PageShell";
import Headline from "@/components/ds/Headline";
import { ArrowRight } from "@/components/ds/Icons";
import JsonLd from "@/components/site/JsonLd";
import ReadingBar from "@/components/blog/ReadingBar";
import PostToc from "@/components/blog/PostToc";
import PostHeroArt from "@/components/blog/PostHeroArt";
import PostCard from "@/components/blog/PostCard";
import { outlineOf } from "@/components/blog/outline";
import { TOPIC_PHRASE, shortDate, splitTitle, summarize, topicOf } from "@/components/blog/topics";
import { getPost, allPostSlugs, POSTS } from "@/content/blog";
import { articleJsonLd } from "@/lib/blog";
import css from "@/components/blog/Post.module.css";

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
          url: "/og.png?v=folded-room",
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
      images: ["/og.png?v=folded-room"],
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
  const topic = topicOf(post);
  const outline = outlineOf(Body);
  const { lead, tail } = splitTitle(post.slug, post.title);
  const size = lead.length <= 32 ? css.titleL : lead.length <= 56 ? css.titleM : css.titleS;

  // Three more guides for the foot: the same topic first, then the newest.
  const others = POSTS.filter((p) => p.slug !== post.slug);
  const sameTopic = topic ? others.filter((p) => topicOf(p)?.id === topic.id) : [];
  const more = [...sameTopic, ...others.filter((p) => !sameTopic.includes(p))].slice(0, 3).map(summarize);
  const moreTail = topic && more.every((p) => p.topic === topic.id) ? TOPIC_PHRASE[topic.id] : "the guides.";

  return (
    <PageShell>
      <JsonLd data={jsonLd} />
      <ReadingBar targetId="post-body" />

      <header className={css.header} aria-labelledby="page-title">
        <div className={`ds-wrap ${css.headerGrid}`}>
          <div>
            <nav aria-label="Breadcrumb" className={`ds-crumbs ${css.crumbs}`} data-reveal="load">
              <ol>
                <li>
                  <Link href="/blog">Blog</Link>
                </li>
                {topic && (
                  <li>
                    <Link href={`/blog?topic=${topic.id}`}>{topic.label}</Link>
                  </li>
                )}
              </ol>
            </nav>
            <Headline
              as="h1"
              id="page-title"
              load
              delayMs={60}
              className={`${css.title} ${size}`}
              lines={[
                { text: tail ? `${lead} ` : lead, riso: true },
                ...(tail ? [{ text: tail, serif: true }] : []),
              ]}
            />
            <div className={css.byline} data-reveal="load" style={{ "--i": 3 } as React.CSSProperties}>
              <div className={css.author}>
                <span className={css.avatar} aria-hidden="true">
                  d<i />
                </span>
                <div className={css.authorText}>
                  <p className={css.authorName}>By Dormscape</p>
                  <p className={css.authorMeta}>
                    <time dateTime={post.date}>{shortDate(post.date)}</time> · {post.readingTimeMin} min read
                    {updated !== post.date && (
                      <>
                        {" "}
                        · Updated <time dateTime={updated}>{shortDate(updated)}</time>
                      </>
                    )}
                  </p>
                </div>
              </div>
              {outline.checklistId && (
                <a href={`#${outline.checklistId}`} className={css.jump}>
                  Jump to the checklist
                  <ArrowRight size={16} />
                </a>
              )}
            </div>
          </div>
          <div className={css.visual} data-reveal-img="load">
            <PostHeroArt slug={post.slug} />
          </div>
        </div>
      </header>

      <div className={css.body}>
        <div className={`ds-wrap ${css.bodyGrid}`}>
          {outline.headings.length > 0 ? <PostToc headings={outline.headings} title={post.title} /> : <div />}
          <article className={css.article} id="post-body" aria-labelledby="page-title">
            <div className={`ds-prose ${css.prose}`}>
              <Body />
            </div>
            <footer className={css.foot}>
              <p className={css.footBy}>
                <span className={css.avatar} aria-hidden="true">
                  d
                </span>
                <span>
                  <strong>Written by Dormscape.</strong>
                  {topic && <> Filed under {topic.label}.</>}
                </span>
              </p>
              <Link href="/methodology" className={css.footLink}>
                How we source room sizes
                <ArrowRight size={15} />
              </Link>
            </footer>
          </article>
        </div>
      </div>

      <section className={css.more} aria-labelledby="more-title">
        <div className="ds-wrap">
          <div className={css.moreHead}>
            <Headline
              id="more-title"
              className="ds-h2 ds-h2--inline"
              lines={[{ text: "Keep reading " }, { text: moreTail, serif: true }]}
            />
            <Link href="/blog" className={css.moreAll}>
              All guides
              <ArrowRight size={17} />
            </Link>
          </div>
          <ul className={css.moreGrid}>
            {more.map((p, i) => (
              <li key={p.slug} data-reveal="" style={{ "--i": i } as React.CSSProperties}>
                <PostCard post={p} as="h3" />
              </li>
            ))}
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
