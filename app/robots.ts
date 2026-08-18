import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dormscape.us";

/**
 * /robots.txt (App Router metadata convention). Public marketing + tool pages
 * are crawlable; private/authenticated and machine-only routes are disallowed:
 *   /account*       account, saved designs, settings, billing, compare
 *   /api/*          all API routes incl. the Stripe checkout/webhook endpoints
 *   /reset-password password-recovery landing (private, token in URL)
 * The sitemap (app/sitemap.ts) is referenced so crawlers find every college page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/account", "/api/", "/reset-password"],
    },
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
