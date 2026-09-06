import type { Metadata } from "next";

/**
 * Shared SEO infrastructure: one place for the canonical origin, page metadata
 * (canonical + Open Graph + Twitter in a single call), and the schema.org
 * builders. Pages should call `pageMetadata()` instead of hand-rolling an
 * openGraph/twitter block, so canonicals and card images can never drift.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://dormscape.us";

export const SITE_NAME = "Dormscape";

/** The one-line description of what this product is, reused across schema. */
export const SITE_TAGLINE =
  "A free dorm room planner built on real, building-specific dorm dimensions.";

/** Absolute URL for a site-relative path ("/colleges" -> "https://.../colleges"). */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Dormscape, the free dorm room planner",
};

/**
 * Build a page's Metadata with a canonical URL and matching OG/Twitter cards.
 * `title` is the page title (the root layout appends the brand); `ogTitle`
 * overrides the social title when the branded form reads better there.
 */
export function pageMetadata({
  title,
  description,
  path,
  ogTitle,
  absoluteTitle = false,
  noIndex = false,
  type = "website",
}: {
  title: string;
  description: string;
  path: string;
  ogTitle?: string;
  /** Skip the "| dormscape" template (the homepage carries the brand itself). */
  absoluteTitle?: boolean;
  /** Utility pages (login, thank-you) that shouldn't compete in the index. */
  noIndex?: boolean;
  type?: "website" | "article";
}): Metadata {
  const social = ogTitle ?? `${title} | ${SITE_NAME.toLowerCase()}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: path },
    ...(noIndex ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      title: social,
      description,
      siteName: SITE_NAME,
      type,
      url: path,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: social,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

// ---- schema.org -----------------------------------------------------------

const organization = {
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${SITE_URL}/icons/icon-512.png`,
    width: 512,
    height: 512,
  },
};

export function organizationJsonLd() {
  return { "@context": "https://schema.org", ...organization };
}

/** WebSite node, tying the brand to the organization identity. */
export function webSiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_TAGLINE,
    publisher: { "@id": `${SITE_URL}/#organization` },
  };
}

/**
 * The planner itself, as a free web application. This is the node that tells
 * search and answer engines *what Dormscape is* ("dorm room planner"), rather
 * than leaving it to be inferred from marketing copy.
 */
export function softwareApplicationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "@id": `${SITE_URL}/#app`,
    name: "Dormscape Dorm Room Planner",
    url: absoluteUrl("/plan"),
    applicationCategory: "DesignApplication",
    applicationSubCategory: "Dorm room planner",
    operatingSystem: "Any (web browser)",
    browserRequirements: "Requires JavaScript",
    description:
      "Plan a college dorm room to scale: pick your school and building to load real room dimensions, arrange furniture in a 2D layout that fits, set a budget and style, and get a shoppable list.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free to plan a room. Optional one-time Plus and Pro upgrades.",
    },
    publisher: { "@id": `${SITE_URL}/#organization` },
    isAccessibleForFree: true,
  };
}

/** Breadcrumb trail. Pass [{name, path}] from root to current page. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** A simple ordered list of links (college index, building index). */
export function itemListJsonLd(
  name: string,
  items: { name: string; path: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}
