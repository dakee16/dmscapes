import type { Metadata } from "next";

// A step inside the planner, not a landing page: keep it out of the index but
// let crawlers follow its links. No canonical, so it doesn't point at /plan.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
