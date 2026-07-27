import type { ComponentType } from "react";

/**
 * One FAQ pair. The same array feeds the visible FAQ section AND the FAQPage
 * JSON-LD, so the two can never drift apart (Google requires them to match).
 * Keep answers self-contained and plain-text: that is what AI answer engines
 * and featured snippets pull cleanly.
 */
export type BlogFaq = {
  q: string;
  a: string;
};

/**
 * Everything a post needs except its body. Adding a post is: write one file in
 * content/blog/, fill this out, and register it in content/blog/index.ts.
 */
export type BlogMeta = {
  /** URL slug. Descriptive, e.g. "how-to-measure-your-dorm-room". */
  slug: string;
  /** The page H1 and the base of the <title>. */
  title: string;
  /** <title> override, when the H1 is longer than a good search title. */
  metaTitle?: string;
  /** Meta description + OG/Twitter description. Keep under 160 characters. */
  description: string;
  /** One-line hook shown on the /blog index card. */
  excerpt: string;
  /** Published date, ISO yyyy-mm-dd. */
  date: string;
  /** Last-updated date, ISO yyyy-mm-dd. Falls back to `date` when absent. */
  updated?: string;
  /** Reading-time estimate in minutes, shown on the index and post header. */
  readingTimeMin: number;
  /** Short topic label for grouping this post's FAQs on the standalone /faq
   *  page, e.g. "Measuring". Falls back to the title when absent. */
  faqTopic?: string;
  /** FAQ pairs. No longer shown inside the post; the standalone /faq page rolls
   *  these up by topic and emits the FAQPage JSON-LD. */
  faqs?: BlogFaq[];
};

/** A registered post: its metadata plus the body component. */
export type BlogPost = BlogMeta & {
  Body: ComponentType;
};
