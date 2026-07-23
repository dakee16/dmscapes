import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Baseline hardening headers. A full Content-Security-Policy is deliberately
  // NOT set here: it needs a careful pass over Next's inline scripts, Konva,
  // and PostHog before it can ship without breaking the app.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Browsers must not MIME-sniff responses into executable types.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // No page on this site should ever render inside an iframe.
          { key: "X-Frame-Options", value: "DENY" },
          // Don't leak full URLs (room share ids, etc.) to external sites.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
