"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

export interface FaqGroup {
  topic: string;
  slug: string;
  title: string;
  faqs: { q: string; a: string }[];
}

/**
 * Searchable, grouped FAQ browser. The /faq page already groups questions by
 * topic with jump links; this adds a live text filter across every question and
 * answer (28+ questions warrants it) while keeping the same grouped layout and
 * "Read the guide" links. Purely client-side filtering over the passed groups.
 */
export default function FaqBrowser({ groups }: { groups: FaqGroup[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        faqs: g.faqs.filter(
          (f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.faqs.length > 0);
  }, [groups, q]);

  const totalMatches = filtered.reduce((n, g) => n + g.faqs.length, 0);

  return (
    <div>
      {/* Search / filter */}
      <div className="mt-8">
        <label htmlFor="faq-search" className="sr-only">
          Search the FAQ
        </label>
        <div className="flex h-12 items-center gap-2.5 rounded-xl border border-ink/15 bg-white px-4 transition-colors focus-within:border-cobalt">
          <svg viewBox="0 0 24 24" className="h-4 w-4 shrink-0 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" strokeLinecap="round" />
          </svg>
          <input
            id="faq-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search questions, e.g. measure, cost, style…"
            className="focus-quiet h-full flex-1 bg-transparent text-base outline-none placeholder:text-ink-soft/60"
          />
        </div>
        {q && (
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wide text-ink-soft" aria-live="polite">
            {totalMatches} {totalMatches === 1 ? "match" : "matches"}
          </p>
        )}
      </div>

      {/* Topic jump links (hidden while actively searching). */}
      {!q && (
        <nav aria-label="FAQ topics" className="mt-6 flex flex-wrap gap-2">
          {groups.map((g) => (
            <a
              key={g.slug}
              href={`#faq-${g.slug}`}
              className="rounded-full border border-ink/10 bg-card px-3 py-1.5 font-mono text-[11px] uppercase tracking-wide text-ink-soft transition-colors hover:border-cobalt/40 hover:text-cobalt"
            >
              {g.topic}
            </a>
          ))}
        </nav>
      )}

      <div className="mt-12 space-y-14">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink/20 bg-white px-5 py-10 text-center">
            <p className="text-sm text-ink-soft">
              No questions match &ldquo;{query.trim()}&rdquo;. Try a different word, or{" "}
              <Link href="/contact" className="font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-2 hover:text-cobalt">
                ask us directly
              </Link>
              .
            </p>
          </div>
        ) : (
          filtered.map((g) => (
            <section key={g.slug} id={`faq-${g.slug}`} className="scroll-mt-24">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h2 className="font-display text-2xl font-bold tracking-tight sm:text-[1.7rem]">
                  {g.topic}
                </h2>
                <Link
                  href={`/blog/${g.slug}`}
                  className="font-mono text-[11px] uppercase tracking-wide text-cobalt transition-colors hover:text-cobalt-deep"
                >
                  Read the guide
                </Link>
              </div>
              <div className="mt-5 divide-y divide-ink/8">
                {g.faqs.map((f) => (
                  <div key={f.q} className="py-5 first:pt-0">
                    <h3 className="font-display text-lg font-bold tracking-tight text-ink">
                      {f.q}
                    </h3>
                    <p className="mt-2 text-base leading-relaxed text-ink-soft">{f.a}</p>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
