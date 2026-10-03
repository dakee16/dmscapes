import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import Headline from "@/components/ds/Headline";
import { ArrowRight } from "@/components/ds/Icons";
import CorridorPlan from "@/components/not-found/CorridorPlan";
import css from "@/components/not-found/NotFound.module.css";

// Root not-found: Next.js renders this both for explicit notFound() calls
// (invalid college slug, saved-room id, blog post) and as the catch-all for any
// URL that matches no route. Non-streamed responses return a real 404 status,
// and Next injects <meta name="robots" content="noindex"> automatically.
export default function NotFound() {
  return (
    <PageShell>
      <section className={css.stage} aria-labelledby="not-found-title">
        <div className={`ds-wrap ${css.grid}`}>
          <div className={css.copy}>
            <p className={`ds-eyebrow ${css.eyebrow}`} data-reveal="load">
              404: off the map
            </p>
            <Headline
              as="h1"
              id="not-found-title"
              load
              delayMs={60}
              className={css.title}
              lines={[
                { text: "This page isn’t ", riso: true },
                { text: "on the floor plan.", serif: true },
              ]}
            />
            <p className={`ds-lede ${css.lede}`} data-reveal="load" style={{ "--i": 3 } as React.CSSProperties}>
              The link is probably old, or the page moved. No harm done, everything
              you came for is a click away.
            </p>
            <div className={css.actions} data-reveal="load" style={{ "--i": 4 } as React.CSSProperties}>
              <Link href="/plan" className="ds-btn ds-btn--ink-yellow">
                Plan my room
                <ArrowRight />
              </Link>
              <Link href="/" className="ds-btn ds-btn--ghost-ink">
                Back to home
              </Link>
            </div>
            <p className={css.more} data-reveal="load" style={{ "--i": 5 } as React.CSSProperties}>
              <Link href="/colleges">Find your campus</Link>
              <span className={css.sep} aria-hidden="true">·</span>
              <Link href="/rooms">My designs</Link>
              <span className={css.sep} aria-hidden="true">·</span>
              <Link href="/blog">Blog</Link>
              <span className={css.sep} aria-hidden="true">·</span>
              <Link href="/report">Report a broken link</Link>
            </p>
          </div>
          <CorridorPlan />
        </div>
        <div className={css.tape} aria-hidden="true">
          MEASURE · IMAGINE · MAKE ROOM
        </div>
      </section>
    </PageShell>
  );
}
