"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { isPlus } from "@/lib/plan";

/**
 * Sits right next to the wordmark: a small "Upgrade" pill for signed-in free
 * users (Plus members see the "+" on the wordmark instead, so this renders
 * nothing for them). Hidden on the tightest screens to keep the header calm.
 */
export default function PlanBadge() {
  const { user, profile, loading } = useAuth();
  if (loading || !user || isPlus(profile)) return null;

  return (
    <Link
      href="/pricing"
      className="hidden shrink-0 items-center gap-1 rounded-full border border-cobalt/30 bg-cobalt/5 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-cobalt transition-colors hover:bg-cobalt/10 sm:inline-flex"
    >
      <span className="font-display text-xs font-extrabold leading-none">+</span>
      Upgrade
    </Link>
  );
}
