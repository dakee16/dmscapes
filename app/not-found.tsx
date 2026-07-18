import Link from "next/link";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";

export default function NotFound() {
  return (
    <div>
      <Nav />
      <main className="relative min-h-[70vh]">
        <div
          className="grid-paper grid-paper-fade absolute inset-x-0 top-0 -z-10 h-[28rem]"
          aria-hidden="true"
        />
        <div className="mx-auto max-w-xl px-5 py-20 sm:px-8 sm:py-28">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
            404 — off the map
          </p>
          <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight sm:text-5xl">
            This page isn&rsquo;t <span className="hl">built yet.</span>
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-ink-soft">
            Either the link is old or we haven&rsquo;t gotten to this corner of
            campus. The planner works, though.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-ink px-6 py-3 font-semibold text-white transition-colors hover:bg-cobalt"
            >
              Back home
            </Link>
            <Link
              href="/plan"
              className="rounded-lg bg-cobalt px-6 py-3 font-semibold text-white transition-colors hover:bg-cobalt-deep"
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
