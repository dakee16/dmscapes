import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";
import Footer from "@/components/Footer";

// Root not-found: Next.js renders this both for explicit notFound() calls
// (invalid college slug, saved-room id, blog post) and as the catch-all for any
// URL that matches no route. Non-streamed responses return a real 404 status,
// and Next injects <meta name="robots" content="noindex"> automatically.
export default function NotFound() {
  return (
    <div>
      <SiteHeader gridClassName="h-[28rem]" />
      <main className="min-h-[68vh]">
        <div className="mx-auto max-w-xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            404: off the map
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            This page isn&rsquo;t on the{" "}
            <span className="hl">floor plan.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
            The link is probably old, or the page moved. No harm done, everything
            you came for is a click away.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex h-13 items-center justify-center rounded-xl bg-cobalt px-7 text-base font-semibold text-white shadow-[0_14px_32px_-14px_rgba(43,78,255,0.6)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-cobalt-deep hover:shadow-[0_20px_40px_-16px_rgba(43,78,255,0.7)] active:translate-y-0"
            >
              Back to home
            </Link>
            <Link
              href="/plan"
              className="inline-flex h-13 items-center justify-center rounded-xl border border-ink/15 bg-white px-7 text-base font-semibold text-ink transition-all duration-200 hover:-translate-y-0.5 hover:border-cobalt/40 active:translate-y-0"
            >
              Plan my room
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
