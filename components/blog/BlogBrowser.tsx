"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PlanCta from "@/components/site/PlanCta";
import { ArrowRight } from "@/components/ds/Icons";
import PostCard from "./PostCard";
import PostCover from "./PostCover";
import { shortDate, type PostSummary } from "./topics";
import css from "./Blog.module.css";

/**
 * The /blog index below the hero: topic filters, the newest guide as a wide
 * feature, and the rest as a cover grid. Filtering is client-side over the
 * posts the server passed in; the choice is mirrored in ?topic= so a filtered
 * view can be linked to.
 */
export default function BlogBrowser({
  posts,
  topics,
}: {
  posts: PostSummary[];
  topics: { id: string; label: string }[];
}) {
  const [topic, setTopic] = useState("all");

  // Honor a ?topic= link (from a post's crumb) after hydration.
  useEffect(() => {
    const wanted = new URLSearchParams(window.location.search).get("topic");
    if (wanted && topics.some((t) => t.id === wanted)) setTopic(wanted);
  }, [topics]);

  const choose = (id: string) => {
    setTopic(id);
    const url = new URL(window.location.href);
    if (id === "all") url.searchParams.delete("topic");
    else url.searchParams.set("topic", id);
    window.history.replaceState(window.history.state, "", url);
  };

  const list = topic === "all" ? posts : posts.filter((p) => p.topic === topic);
  const [featured, ...rest] = list;
  const label = (id?: string) => topics.find((t) => t.id === id)?.label;
  const active = label(topic);

  return (
    <>
      <div className={`ds-wrap ${css.filterRow}`}>
        <div role="group" aria-label="Filter guides by topic" className={css.filters} data-reveal="load" style={{ "--i": 4 } as React.CSSProperties}>
          {[{ id: "all", label: "All" }, ...topics].map((t) => (
            <button
              key={t.id}
              type="button"
              className={css.filter}
              aria-pressed={topic === t.id}
              onClick={() => choose(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className="ds-sr" aria-live="polite">
          {active ? `${list.length} ${list.length === 1 ? "guide" : "guides"} about ${active}` : `All ${list.length} guides`}
        </p>
      </div>

      {featured && (
        <section className={css.featuredSection} aria-label={active ? `Newest about ${active}` : "Newest"}>
          <div className="ds-wrap">
            <Link href={`/blog/${featured.slug}`} className={css.featured} key={featured.slug}>
              <span className={css.featuredCover}>
                <PostCover
                  slug={featured.slug}
                  tag={["Newest", label(featured.topic)].filter(Boolean).join(" · ")}
                />
              </span>
              <span className={css.featuredBody}>
                <span className={css.featuredMeta}>
                  <time dateTime={featured.date}>{shortDate(featured.date)}</time> · {featured.readingTimeMin} min read
                </span>
                <h2 className={css.featuredTitle} data-long={featured.title.length > 48 || undefined}>
                  {featured.title}
                </h2>
                <span className={css.featuredExcerpt}>{featured.excerpt}</span>
                <span className={css.featuredGo}>
                  Read the guide
                  <ArrowRight />
                </span>
              </span>
            </Link>
          </div>
        </section>
      )}

      <section className={css.gridSection} aria-label={active ? `More about ${active}` : "All guides"}>
        <ul className={`ds-wrap ${css.grid}`}>
          {rest.map((p) => (
            <li key={p.slug}>
              <PostCard post={p} />
            </li>
          ))}
          <li className={css.ctaCell}>
            <div className={css.ctaCard}>
              <span className={css.ctaEyebrow}>Skip the reading</span>
              <p className={css.ctaTitle}>Your room is waiting.</p>
              <PlanCta
                className={css.ctaLink}
                freeLabel="Plan my room for free"
                paidLabel="Plan my room"
                icon={<ArrowRight size={17} />}
              />
            </div>
          </li>
        </ul>
      </section>
    </>
  );
}
