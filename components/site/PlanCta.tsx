"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { isPaid } from "@/lib/plan";

/**
 * The "plan your room" call to action, tier-aware. Logged-out and free-tier
 * visitors get the free framing ("Plan my room for free"); paying Plus/Pro
 * customers get the plain "Plan my room" (no "for free", since they already
 * bought in). One component so every CTA across the site stays consistent.
 * Renders identically to the plain <Link> it replaces, just with a live label.
 */
export default function PlanCta({
  className,
  freeLabel = "Plan my room for free",
  paidLabel = "Plan my room",
  href = "/plan",
}: {
  className?: string;
  freeLabel?: string;
  paidLabel?: string;
  href?: string;
}) {
  const { profile } = useAuth();
  return (
    <Link href={href} className={className}>
      {isPaid(profile) ? paidLabel : freeLabel}
    </Link>
  );
}
