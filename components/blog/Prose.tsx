import type { ReactNode } from "react";
import Link from "next/link";
import PlanCta from "@/components/site/PlanCta";
import { ArrowRight } from "@/components/ds/Icons";
import css from "./Post.module.css";

// Long-form primitives for blog posts. A post is almost pure content: import
// these, write the words. The post page wraps the body in `.ds-prose`, which
// carries the type; these add the few pieces it doesn't (lead, callout, the
// closing call to action) and keep the deep-link ids on headings.

export function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Opening summary paragraph. Sits right under the H1 and answers the core
 *  question plainly, since AI answer engines lean on the top of the page. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className={css.lead}>{children}</p>;
}

/** Section heading. Auto-derives an id from plain-text children so sections are
 *  deep-linkable (and listed in the post's contents). */
export function H2({ children, id }: { children: ReactNode; id?: string }) {
  const anchor =
    id ?? (typeof children === "string" ? slugify(children) : undefined);
  return <h2 id={anchor}>{children}</h2>;
}

export function H3({ children }: { children: ReactNode }) {
  return <h3>{children}</h3>;
}

export function P({ children }: { children: ReactNode }) {
  return <p>{children}</p>;
}

export function Ul({ children }: { children: ReactNode }) {
  return <ul>{children}</ul>;
}

export function Ol({ children }: { children: ReactNode }) {
  return <ol>{children}</ol>;
}

export function Li({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

/** Inline text link. Internal links go through next/link; pass external for outbound. */
export function TextLink({
  href,
  children,
  external,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  }
  return <Link href={href}>{children}</Link>;
}

/** Index-card aside for tips and Dormscape tie-ins. Children are paragraphs. */
export function Callout({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <aside className={css.callout} data-labelled={label ? "" : undefined}>
      {label ? <div className={css.calloutLabel}>{label}</div> : null}
      <div className={css.calloutBody}>{children}</div>
    </aside>
  );
}

/** Closing call to action: an ink card under a strip of tape. */
export function EndCTA({
  children,
  href = "/plan",
  cta = "Plan my room for free",
}: {
  children: ReactNode;
  href?: string;
  cta?: string;
}) {
  return (
    <div className={css.endCta}>
      <div className={css.endCtaCopy}>
        <p className={css.endCtaText}>{children}</p>
        <PlanCta
          href={href}
          className="ds-btn ds-btn--yellow"
          freeLabel={cta}
          paidLabel={cta.replace(/\s*for free$/i, "")}
          icon={<ArrowRight />}
        />
      </div>
      <figure className={css.endCtaArt} aria-hidden="true">
        <svg viewBox="0 0 96 100" focusable="false">
          <rect x="1.5" y="1.5" width="93" height="93" fill="none" stroke="#fff" strokeWidth="3" />
          <rect x="6" y="6" width="22" height="46" fill="#5B7CFF" />
          <rect x="68" y="6" width="22" height="46" fill="#5B7CFF" />
          <rect x="28" y="62" width="40" height="26" fill="#FFD83D" />
        </svg>
        <figcaption>To scale · furnished</figcaption>
      </figure>
    </div>
  );
}
