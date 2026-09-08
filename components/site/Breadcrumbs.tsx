import Link from "next/link";

/**
 * Visible breadcrumb trail for the deep school/building pages. Doubles as
 * internal linking: every building page links back up to its school and to the
 * college index, so crawl depth stays shallow and the hierarchy is legible.
 * Pair with breadcrumbJsonLd() from lib/seo for the structured-data version.
 */
export default function Breadcrumbs({
  items,
  className = "",
}: {
  /** Root to current page. The last item renders as plain text (current). */
  items: { name: string; path: string }[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-soft">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={item.path} className="flex items-center gap-1.5">
              {i > 0 && (
                <span aria-hidden="true" className="text-ink-soft/50">
                  /
                </span>
              )}
              {last ? (
                <span aria-current="page" className="text-ink">
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.path}
                  className="underline-offset-4 transition-colors hover:text-cobalt hover:underline"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
