import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import Headline from "@/components/ds/Headline";
import { Check, ChevronDown } from "@/components/ds/Icons";
import PrintButton from "./PrintButton";
import { LEGAL_DOCS, LEGAL_ORDER, sectionNumber, type LegalKey } from "./docs";
import css from "./Legal.module.css";

/** "September 28, 2026" -> "SEP 28, 2026" for the stamp. */
function stampDate(updated: string) {
  return updated.replace(/^([A-Za-z]{3})[A-Za-z]*/, "$1").toUpperCase();
}

/**
 * The shared Terms / Privacy / Cookies template
 * (design-handoff/designs/site/Legal.dc.html): a sky hero with a "last updated"
 * stamp and folder tabs that are real links to the three policies, then a
 * white sheet with a sticky contents list beside the document. Every route
 * passes its own title, date, intro, recap and sections, word for word.
 */
export default function LegalLayout({
  doc,
  title,
  updated,
  intro,
  summary,
  children,
}: {
  doc: LegalKey;
  title: string;
  /** e.g. "September 28, 2026"; shown as "Last updated: …" */
  updated: string;
  intro: React.ReactNode;
  summary?: { note: string; items: readonly string[] };
  children: React.ReactNode;
}) {
  const current = LEGAL_DOCS[doc];
  const sections: readonly { id: string; title: string }[] = current.sections;
  const first = LEGAL_ORDER[0] === doc;

  const contents = (
    <ol className={css.tocList}>
      {sections.map((s, i) => (
        <li key={s.id}>
          <a href={`#${s.id}`}>
            <span className={`ds-num ${css.tocNum}`} aria-hidden="true">
              {sectionNumber(i)}
            </span>
            <span className={css.tocText}>{s.title}</span>
          </a>
        </li>
      ))}
    </ol>
  );

  return (
    <PageShell navOverlay className={css.page}>
      <div className={css.backdrop}>
        <header className={css.hero}>
          <div className={`ds-wrap ${css.heroInner}`}>
            <p className={`ds-eyebrow ${css.eyebrow}`} data-reveal="load">
              Terms · Privacy · Cookies
            </p>
            <Headline
              as="p"
              load
              delayMs={60}
              className={css.headline}
              lines={[
                { text: "The fine print, ", riso: true },
                { text: "in plain words.", serif: true },
              ]}
            />
            <div className={css.stampWrap} data-pop="" aria-hidden="true">
              <div className={css.stamp}>
                <span className={css.stampLabel}>LAST UPDATED</span>
                <span className={css.stampDate}>{stampDate(updated)}</span>
                <span className={css.stampDoc}>DORMSCAPE · {current.label.toUpperCase()}</span>
              </div>
            </div>
            <nav aria-label="Policies" className={css.tabs}>
              {LEGAL_ORDER.map((key) => {
                const d = LEGAL_DOCS[key];
                return (
                  <Link
                    key={key}
                    href={d.href}
                    className={css.tab}
                    aria-current={key === doc ? "page" : undefined}
                  >
                    {d.label}
                    <span className={`ds-num ${css.tabCount}`} aria-hidden="true">
                      {d.sections.length}
                    </span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        <div className={`ds-wrap ${css.sheet}`} data-first={first || undefined}>
          <aside className={css.aside}>
            <nav aria-label="On this page" className={css.toc}>
              <p className={css.tocLabel}>On this page</p>
              {contents}
            </nav>
            <div className={css.asideActions}>
              <PrintButton className={`ds-btn ds-btn--ghost-ink ${css.asideBtn}`} />
              <Link href="/contact" className={`ds-btn ds-btn--ink ${css.asideBtn}`}>
                Ask us a question
              </Link>
            </div>
          </aside>

          <article className={css.doc} data-legal-doc="">
            <div className={css.kicker}>
              <p>Legal</p>
              <p>Last updated: {updated}</p>
            </div>
            <h1 className={css.title}>{title}</h1>
            <div className={css.intro}>{intro}</div>

            <details className={css.tocMobile} data-legal-chrome="">
              <summary>
                <span>On this page</span>
                <span className={`ds-num ${css.tocMobileCount}`}>{sections.length} sections</span>
                <ChevronDown size={16} />
              </summary>
              <nav aria-label="On this page">{contents}</nav>
            </details>

            {summary && (
              <aside className={css.short} aria-labelledby="short-version" data-reveal="">
                <div className={css.shortHead}>
                  <p id="short-version" className={css.shortTitle}>
                    The short version
                  </p>
                  <p className={css.shortNote}>{summary.note}</p>
                </div>
                <ul className={css.shortList}>
                  {summary.items.map((item) => (
                    <li key={item}>
                      <Check size={22} strokeWidth={3} className={css.shortCheck} />
                      {item}
                    </li>
                  ))}
                </ul>
              </aside>
            )}

            <div className={css.sections}>{children}</div>

            <div className={css.ask} data-legal-chrome="">
              <p className={css.askText}>
                Something unclear? <span className="ds-serif">Ask a human.</span>
              </p>
              <a href="mailto:info@dormscape.us" className={css.askMail}>
                info@dormscape.us
              </a>
            </div>
          </article>
        </div>
      </div>
    </PageShell>
  );
}
