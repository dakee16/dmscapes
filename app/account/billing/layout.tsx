import type { Metadata } from "next";

// Private, per-user page. Keep it out of search (parent /account layout also
// noindexes, but be explicit).
export const metadata: Metadata = {
  title: "Billing",
  robots: { index: false },
};

export default function AccountBillingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
