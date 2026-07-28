import type { Metadata } from "next";

// Private, per-user page. Keep it out of search.
export const metadata: Metadata = {
  title: "Compare designs",
  robots: { index: false },
};

export default function CompareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
