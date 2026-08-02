import type { Metadata } from "next";

// Private, per-user page, keep it out of search.
export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false },
};

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return children;
}
