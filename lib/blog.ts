import type { BlogFaq, BlogPost } from "@/content/blog/types";

// Absolute base for canonical URLs and schema. Mirrors app/sitemap.ts.
export const BLOG_BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dormscape.us";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Schema.org dates as full ISO 8601 with a timezone, which Google's Rich
 * Results Test expects: a date-only "2026-09-15" becomes "2026-09-15T12:00:00Z"
 * (noon UTC, the same calendar day across US time zones); a value that already
 * has a time passes through unchanged. Sitemap lastmod stays date-only.
 */
export function isoDateTime(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value;
}

/** Format an ISO yyyy-mm-dd as "July 27, 2026". Parsed by parts, not `new
 *  Date()`, so the day never shifts by timezone. */
export function formatBlogDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

// The same identity as the homepage's Organization node (lib/seo), linked by @id.
const org = {
  "@type": "Organization",
  "@id": `${BLOG_BASE}/#organization`,
  name: "Dormscape",
  url: BLOG_BASE,
};

/**
 * BlogPosting JSON-LD for a blog post. One publisher/author identity (Dormscape)
 * and both dates, since AI systems weight source and freshness signals. FAQ
 * markup lives on the standalone /faq page now, not here.
 */
export function articleJsonLd(post: BlogPost) {
  const url = `${BLOG_BASE}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: isoDateTime(post.date),
    dateModified: isoDateTime(post.updated ?? post.date),
    author: org,
    publisher: {
      ...org,
      logo: {
        "@type": "ImageObject",
        url: `${BLOG_BASE}/icons/icon-512.png?v=folded-room`,
        width: 512,
        height: 512,
      },
    },
    image: `${BLOG_BASE}/og.png?v=folded-room`,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
  };
}

/** Aggregated FAQPage JSON-LD for the standalone /faq page. */
export function faqPageJsonLd(faqs: BlogFaq[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}
