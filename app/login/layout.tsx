import type { Metadata } from "next";

// The login page is a client component, so its metadata lives here.
export const metadata: Metadata = { title: "Log In", robots: { index: false, follow: true } };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
