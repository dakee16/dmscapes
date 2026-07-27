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

/** Format an ISO yyyy-mm-dd as "July 27, 2026". Parsed by parts, not `new
 *  Date()`, so the day never shifts by timezone. */
export function formatBlogDate(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

const org = {
  "@type": "Organization",
  name: "Dormscape",
  url: BLOG_BASE,
};

/**
 * Article JSON-LD for a blog post. One publisher/author identity (Dormscape)
 * and both dates, since AI systems weight source and freshness signals. FAQ
 * markup lives on the standalone /faq page now, not here.
 */
export function articleJsonLd(post: BlogPost) {
  const url = `${BLOG_BASE}/blog/${post.slug}`;
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.updated ?? post.date,
    author: org,
    publisher: {
      ...org,
      logo: {
        "@type": "ImageObject",
        url: `${BLOG_BASE}/icons/icon-512.png`,
        width: 512,
        height: 512,
      },
    },
    image: `${BLOG_BASE}/og.png`,
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
