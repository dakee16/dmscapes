import Link from "next/link";

/**
 * Visible breadcrumb trail. Pair with breadcrumbJsonLd() from lib/seo. Pass
 * the same items; the "Home" crumb is dropped visually (the wordmark is home)
 * but stays in the structured data.
 */
export default function Crumbs({
  items,
  className = "",
  showHome = false,
}: {
  items: { name: string; path: string }[];
  className?: string;
  showHome?: boolean;
}) {
  const shown = showHome ? items : items.filter((i) => i.path !== "/");
  return (
    <nav aria-label="Breadcrumb" className={`ds-crumbs ${className}`}>
      <ol>
        {shown.map((item, i) => (
          <li key={item.path}>
            {i === shown.length - 1 ? (
              <span aria-current="page">{item.name}</span>
            ) : (
              <Link href={item.path}>{item.name}</Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
