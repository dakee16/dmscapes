import type { Metadata } from "next";

// Landing page for the emailed password-reset link. No reason for search
// engines to hold it.
export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false },
};

export default function ResetPasswordLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
