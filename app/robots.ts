import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dormscape.us";

/**
 * /robots.txt (App Router metadata convention). Public marketing + tool pages
 * are crawlable; private/authenticated and machine-only routes are disallowed:
 *   /account*       account, saved designs, settings, billing, compare
 *   /api/*          all API routes incl. the Stripe checkout/webhook endpoints
 *   /reset-password password-recovery landing (private, token in URL)
 *   /dev            dev-only review tools (404 in production anyway)
 * The sitemap (app/sitemap.ts) is referenced so crawlers find every college page.
 */
const PRIVATE = ["/account", "/rooms", "/api/", "/reset-password", "/dev"];

// Answer engines' search and citation crawlers, named so it's explicit they're
// welcome. A crawler reads only the group that names it, so each repeats the
// private paths.
const CITATION_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      { userAgent: CITATION_BOTS, allow: "/", disallow: PRIVATE },
    ],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
