"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, SearchIcon } from "@/components/ds/Icons";
import css from "./Faq.module.css";

export interface FaqGroup {
  topic: string;
  slug: string;
  title: string;
  faqs: { q: string; a: string }[];
  /** card colour for the collapsed topic */
  tone: "white" | "ink" | "night";
}

/* ---------- shared search state (hero input + question list) ---------- */

const SearchCtx = createContext<{ query: string; setQuery: (q: string) => void }>({
  query: "",
  setQuery: () => {},
});

export function FaqProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  return <SearchCtx.Provider value={{ query, setQuery }}>{children}</SearchCtx.Provider>;
}

/** The hero's search box: filters every question and answer as you type. */
export function FaqSearch({ total }: { total: number }) {
  const { query, setQuery } = useContext(SearchCtx);
  return (
    <form role="search" className={css.search} onSubmit={(e) => e.preventDefault()}>
      <label htmlFor="faq-search" className="ds-sr">
        Search the FAQ
      </label>
      <SearchIcon size={22} />
      <input
        id="faq-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={`Search ${total} questions, e.g. measure, cost, style…`}
        autoComplete="off"
      />
      {query && (
        <button type="button" className={css.clear} onClick={() => setQuery("")}>
          Clear
        </button>
      )}
    </form>
  );
}

/* ---------- small figures drawn from specific answers ---------- */

function Figure({ q }: { q: string }) {
  if (q === "How much space do I need between dorm furniture?") {
    return (
      <span className={css.figClearance} aria-hidden="true">
        <span className={css.figBlock} />
        <span className={css.figRule}>
          <b>2′ 6″</b>
        </span>
        <span className={css.figBlock} />
      </span>
    );
  }
  if (q === "What size rug fits a standard dorm room?") {
    return (
      <span className={css.figRug} aria-hidden="true">
        5′ × 7′
      </span>
    );
  }
  if (q === "How much does it cost to set up a dorm room in 2026?") {
    return (
      <span className={css.figTiers} aria-hidden="true">
        <span>$300–450 budget</span>
        <span>$600–1,000 mid-range</span>
        <span>$1,200+ premium</span>
      </span>
    );
  }
  return null;
}
const WIDE_FIGURE = "How much does it cost to set up a dorm room in 2026?";

/* ---------- index + groups ---------- */

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * Every topic with its questions. The first few topics open on load; the rest
 * wait as cards (and in the side index) and open in place when picked. Every
 * question stays in the page either way, and a search opens whatever matches.
 */
export function FaqBrowser({ groups, openFirst = 3 }: { groups: FaqGroup[]; openFirst?: number }) {
  const { query, setQuery } = useContext(SearchCtx);
  const q = query.trim().toLowerCase();
  const [opened, setOpened] = useState<Set<string>>(() => new Set(groups.slice(0, openFirst).map((g) => g.slug)));
  const [target, setTarget] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);
  const indexRef = useRef<HTMLUListElement>(null);

  const matches = useMemo(() => {
    const m = new Map<string, FaqGroup["faqs"]>();
    for (const g of groups) {
      m.set(g.slug, q ? g.faqs.filter((f) => f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q)) : g.faqs);
    }
    return m;
  }, [groups, q]);
  const totalMatches = q ? [...matches.values()].reduce((n, f) => n + f.length, 0) : 0;
  const isShown = useCallback(
    (slug: string) => (q ? (matches.get(slug)?.length ?? 0) > 0 : opened.has(slug)),
    [q, matches, opened]
  );

  const open = useCallback((slug: string) => {
    setOpened((prev) => (prev.has(slug) ? prev : new Set(prev).add(slug)));
    setTarget(slug);
  }, []);

  // A link to /faq#faq-<topic> opens that topic.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash.startsWith("faq-") && groups.some((g) => g.slug === hash.slice(4))) open(hash.slice(4));
  }, [groups, open]);

  // After a topic opens, bring it into view and move focus to its heading.
  useEffect(() => {
    if (!target) return;
    const section = document.getElementById(`faq-${target}`);
    if (section && !section.hidden) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      section.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
      section.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
      window.history.replaceState(window.history.state, "", `#faq-${target}`);
    }
    setTarget(null);
  }, [target]);

  // Highlight the topic in view.
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const line = window.innerHeight * 0.35;
      let id: string | null = null;
      for (const g of groups) {
        const el = document.getElementById(`faq-${g.slug}`);
        if (!el || el.hidden) continue;
        if (el.getBoundingClientRect().top <= line) id = g.slug;
      }
      setActive(id ?? groups.find((g) => isShown(g.slug))?.slug ?? null);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
    };
  }, [groups, isShown]);

  // On phones the index is a sideways strip: keep the current topic in it.
  useEffect(() => {
    const list = indexRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const link = list.querySelector<HTMLElement>('[aria-current="true"]');
    if (link) list.scrollTo({ left: link.offsetLeft - 16, behavior: "auto" });
  }, [active]);

  const closed = groups.filter((g) => !opened.has(g.slug));

  return (
    <div className={`ds-wrap ${css.layout}`}>
      <nav className={css.index} aria-label="FAQ topics">
        <p className={css.indexLabel}>Topics</p>
        <ul ref={indexRef}>
          {groups.map((g) => {
            const count = matches.get(g.slug)?.length ?? 0;
            const empty = q !== "" && count === 0;
            return (
              <li key={g.slug}>
                <a
                  href={`#faq-${g.slug}`}
                  aria-current={active === g.slug ? "true" : undefined}
                  aria-disabled={empty || undefined}
                  data-empty={empty || undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    if (!empty) open(g.slug);
                  }}
                >
                  {g.topic}
                  <span className={css.indexCount}>
                    {count}
                    <span className="ds-sr"> {count === 1 ? "question" : "questions"}</span>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className={css.groups}>
        <p className={css.status} aria-live="polite">
          {q ? `${plural(totalMatches, "match", "matches")} for “${query.trim()}”` : ""}
        </p>
        {q && totalMatches === 0 && (
          <div className={css.empty}>
            <p>
              No questions match &ldquo;{query.trim()}&rdquo;. Try a different word, or{" "}
              <Link href="/contact" className="ds-link">
                ask us directly
              </Link>
              .
            </p>
            <button type="button" className="ds-btn ds-btn--ghost-ink ds-btn--sm" onClick={() => setQuery("")}>
              Clear the search
            </button>
          </div>
        )}

        {groups.map((g) => {
          const faqs = matches.get(g.slug) ?? [];
          const shown = isShown(g.slug);
          return (
            <section
              key={g.slug}
              id={`faq-${g.slug}`}
              className={css.group}
              aria-labelledby={`faq-${g.slug}-title`}
              hidden={!shown}
            >
              <div className={css.groupHead}>
                <h2 id={`faq-${g.slug}-title`} tabIndex={-1}>
                  {g.topic}
                </h2>
                <span className={css.groupCount}>{plural(faqs.length, "question", "questions")}</span>
                <Link href={`/blog/${g.slug}`} className={css.guide}>
                  Read the guide
                  <ArrowRight size={14} />
                </Link>
              </div>
              {faqs.map((f) => (
                <details key={f.q} className={css.qa} open>
                  <summary>
                    <h3>{f.q}</h3>
                  </summary>
                  <div className={css.answer} data-wide={f.q === WIDE_FIGURE || undefined}>
                    <p>{f.a}</p>
                    <Figure q={f.q} />
                  </div>
                </details>
              ))}
            </section>
          );
        })}

        {!q && closed.length > 0 && (
          <div className={css.more}>
            <h2 className="ds-sr">More topics</h2>
            <ul className={css.cards}>
              {closed.map((g) => (
                <li key={g.slug}>
                  <a
                    href={`#faq-${g.slug}`}
                    className={css.card}
                    data-tone={g.tone}
                    onClick={(e) => {
                      e.preventDefault();
                      open(g.slug);
                    }}
                  >
                    <span className={css.cardTop}>
                      <span className={css.cardTitle}>{g.topic}</span>
                      <span className={css.cardCount}>
                        {g.faqs.length}
                        <span className="ds-sr"> {g.faqs.length === 1 ? "question" : "questions"}, open topic</span>
                        <ArrowRight size={13} />
                      </span>
                    </span>
                    <span className={css.cardQ}>{g.faqs[0]?.q}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
