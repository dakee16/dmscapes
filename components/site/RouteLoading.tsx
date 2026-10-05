import BrandLoader from "@/components/site/BrandLoader";

/**
 * The branded loading screen for app routes that really wait on data (the
 * result studio, My designs and workspaces, shared rooms, My Room, account).
 * Each of those segments re-exports this as its loading.tsx. Content pages
 * have no loading boundary, so their HTML carries the page itself.
 */
export default function RouteLoading() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6">
      <BrandLoader />
    </div>
  );
}
