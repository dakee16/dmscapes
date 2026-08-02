import BrandLoader from "@/components/site/BrandLoader";

// Route-level loading UI (App Router): the Suspense fallback shown on the
// initial load of a segment and during route transitions, so navigations land
// on a branded screen instead of a blank page.
export default function Loading() {
  return (
    <div className="grid min-h-screen place-items-center bg-paper px-6">
      <BrandLoader />
    </div>
  );
}
