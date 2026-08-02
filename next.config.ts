import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

// ---------------------------------------------------------------------------
// Content-Security-Policy
//
// Built with the "Without Nonces" pattern from the Next.js CSP guide
// (node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
// A nonce-based policy would force every page into dynamic rendering, giving
// up static generation for the college pages, legal pages, and planner shell;
// the experimental SRI alternative doesn't cover Next's inline flight-data
// scripts. So script-src carries 'unsafe-inline': CSP here is defense in
// depth (no foreign script origins, no plugins, no framing, fenced fetch
// targets), while React's escaping remains the primary XSS defense.
//
// External origins are derived from the same env vars the app reads, so the
// policy stays in lockstep with configuration: an origin is allowed only when
// the feature using it is actually configured (envs change => redeploy =>
// this re-evaluates).
//
// Dev detection uses the config phase (the documented mechanism for
// per-command config) rather than process.env.NODE_ENV, so the dev-only
// loosenings ('unsafe-eval', ws:) can never leak into a production build.
// ---------------------------------------------------------------------------

/** https://<ref>.supabase.co when configured (browser auth + profile reads). */
const supabaseOrigin = (() => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  try {
    return url ? new URL(url).origin : null;
  } catch {
    return null;
  }
})();

/**
 * PostHog talks to its API host (event capture, remote config fetches) and
 * lazily loads extension scripts (surveys, toolbar, session recorder) from
 * the matching assets host, e.g. us.i.posthog.com -> us-assets.i.posthog.com.
 */
const posthogOrigins = (() => {
  if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) return { api: null, assets: null };
  const api = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";
  try {
    const host = new URL(api).host;
    const assets = host.endsWith(".i.posthog.com")
      ? `https://${host.replace(".i.posthog.com", "-assets.i.posthog.com")}`
      : null;
    return { api: new URL(api).origin, assets };
  } catch {
    return { api: null, assets: null };
  }
})();

function buildCsp(isDev: boolean): string {
  return [
    "default-src 'self'",
    // 'unsafe-eval' in dev only: React dev tooling reconstructs server error
    // stacks with eval. Production builds run without it.
    [
      "script-src 'self' 'unsafe-inline'",
      isDev ? "'unsafe-eval'" : null,
      posthogOrigins.assets,
    ],
    // Tailwind custom properties, framer-motion, and Konva all set inline styles.
    "style-src 'self' 'unsafe-inline'",
    // blob:/data: for canvas layout previews; Amazon CDN for product images.
    "img-src 'self' blob: data: https://m.media-amazon.com",
    // next/font self-hosts every woff2 (verified: .next/static/media).
    "font-src 'self'",
    [
      "connect-src 'self'",
      isDev ? "ws:" : null, // HMR websocket
      supabaseOrigin,
      posthogOrigins.api,
      posthogOrigins.assets,
    ],
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    isDev ? null : "upgrade-insecure-requests",
  ]
    .filter(Boolean)
    .map((d) => (Array.isArray(d) ? d.filter(Boolean).join(" ") : d))
    .join("; ");
}

export default function nextConfig(phase: string): NextConfig {
  const csp = buildCsp(phase === PHASE_DEVELOPMENT_SERVER);
  return {
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Content-Security-Policy", value: csp },
            // Browsers must not MIME-sniff responses into executable types.
            { key: "X-Content-Type-Options", value: "nosniff" },
            // Legacy twin of frame-ancestors for older browsers.
            { key: "X-Frame-Options", value: "DENY" },
            // Don't leak full URLs (room share ids, etc.) to external sites.
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            // Pin the site to HTTPS for two years. Ignored by browsers over
            // http:// (localhost dev), so it's safe to send everywhere. No
            // includeSubDomains/preload, to avoid committing subdomains we
            // don't control to HTTPS.
            { key: "Strict-Transport-Security", value: "max-age=63072000" },
            // Deny powerful features the app never uses, so injected or
            // embedded content can't request them either.
            {
              key: "Permissions-Policy",
              value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
            },
          ],
        },
      ];
    },
  };
}
