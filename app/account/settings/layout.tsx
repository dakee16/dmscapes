import type { Metadata } from "next";

// Private, per-user page. Keep it out of search (parent /account layout also
// noindexes, but be explicit).
export const metadata: Metadata = {
  title: "Account settings",
  robots: { index: false },
};

export default function AccountSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
