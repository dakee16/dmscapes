import type { ReactNode } from "react";
import Link from "next/link";
import PlanCta from "@/components/site/PlanCta";

// Shared long-form primitives for blog posts. They wrap the exact typography
// the rest of the site uses (see app/about/page.tsx) so every post inherits the
// design system without each file re-deriving class strings. A post is then
// almost pure content: import these, write the words.

function slugify(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Opening summary paragraph. Sits right under the H1 and answers the core
 *  question plainly, since AI answer engines lean on the top of the page. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="mt-6 text-xl leading-relaxed text-ink-soft">{children}</p>;
}

/** Section heading. Auto-derives an id from plain-text children so sections are
 *  deep-linkable, which helps featured snippets and AI citations. */
export function H2({ children, id }: { children: ReactNode; id?: string }) {
  const anchor =
    id ?? (typeof children === "string" ? slugify(children) : undefined);
  return (
    <h2
      id={anchor}
      className="mt-14 scroll-mt-24 font-display text-2xl font-bold tracking-tight sm:text-[1.7rem]"
    >
      {children}
    </h2>
  );
}

export function H3({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-8 font-display text-lg font-bold tracking-tight">
      {children}
    </h3>
  );
}

export function P({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 text-[17px] leading-relaxed text-ink-soft">{children}</p>
  );
}

export function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="mt-4 list-disc space-y-2 pl-5 marker:text-cobalt">
      {children}
    </ul>
  );
}

export function Ol({ children }: { children: ReactNode }) {
  return (
    <ol className="mt-4 list-decimal space-y-2 pl-5 marker:font-mono marker:text-sm marker:text-cobalt">
      {children}
    </ol>
  );
}

export function Li({ children }: { children: ReactNode }) {
  return (
    <li className="pl-1 text-[17px] leading-relaxed text-ink-soft">{children}</li>
  );
}

/** Inline text link, reusing the highlight-underline treatment from /plan and
 *  /about. Internal links go through next/link; pass external for outbound. */
export function TextLink({
  href,
  children,
  external,
}: {
  href: string;
  children: ReactNode;
  external?: boolean;
}) {
  const cls =
    "font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt";
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}

/** Card aside for tips and Dormscape tie-ins. Children are paragraphs. */
export function Callout({
  label,
  children,
}: {
  label?: string;
  children: ReactNode;
}) {
  return (
    <aside className="mt-8 rounded-xl border border-ink/10 bg-card p-5 sm:p-6">
      {label ? (
        <div className="mb-2 font-mono text-[11px] uppercase tracking-wide text-cobalt">
          {label}
        </div>
      ) : null}
      <div className="space-y-3 text-[15px] leading-relaxed text-ink-soft">
        {children}
      </div>
    </aside>
  );
}

/** Closing call to action, matching the dashed CTA box on /about. */
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
    <div className="mt-14 rounded-xl border border-dashed border-ink/20 bg-card/60 p-6 text-center">
      <p className="font-medium text-ink">{children}</p>
      <PlanCta
        href={href}
        className="mt-3 inline-block rounded-lg bg-ink px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cobalt"
        freeLabel={cta}
        paidLabel={cta.replace(/\s*for free$/i, "")}
      />
    </div>
  );
}
