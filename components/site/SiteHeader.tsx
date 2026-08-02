import Nav from "@/components/Nav";

/**
 * The site's single header unit, used on every page so the floating island, its
 * graph-paper backdrop, and the credits indicator beside it read identically
 * everywhere (the homepage is the reference).
 *
 * The wrapper is the grid's positioning context and sits at the true top of the
 * page, so the graph-paper band starts *behind* the sticky island (and fades
 * into the page below it) rather than beginning under the header. Pages should
 * render this instead of <Nav/> directly and should not hand-roll their own
 * grid band or negative-margin offset for the header region.
 */
export default function SiteHeader({
  gridClassName = "h-[22rem]",
}: {
  /** Height (or any override) of the graph-paper band behind the header. */
  gridClassName?: string;
}) {
  return (
    <div className="relative">
      <div
        className={`grid-paper grid-paper-fade pointer-events-none absolute inset-x-0 top-0 -z-10 ${gridClassName}`}
        aria-hidden="true"
      />
      <Nav />
    </div>
  );
}
