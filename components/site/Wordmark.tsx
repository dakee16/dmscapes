"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { isPlusTier, isPro } from "@/lib/plan";

/**
 * The Dormscape wordmark. The tier marker (Plus "+" or "PRO") is rendered here,
 * inside the logo component itself, so it appears in every header the member
 * sees and is never editable as loose page text. Free users just see
 * "dormscape".
 */
export default function Wordmark({
  textClassName = "text-lg",
}: {
  textClassName?: string;
}) {
  const { profile } = useAuth();
  const plus = isPlusTier(profile);
  const pro = isPro(profile);

  return (
    <Link
      href="/"
      className="dm-wordmark flex shrink-0 items-center gap-2"
      aria-label={
        pro ? "Dormscape Pro home" : plus ? "Dormscape Plus home" : "Dormscape home"
      }
    >
      <span className={`dm-brand-type font-bold tracking-tight ${textClassName}`}>
        dorm<span className="text-cobalt">scape</span>
        {plus && (
          <span
            className="ml-0.5 text-cobalt"
            title="You're on Dormscape Plus"
            aria-label="Plus"
          >
            +
          </span>
        )}
        {pro && (
          <span
            className="ml-1 align-[0.15em] text-[0.5em] font-extrabold uppercase tracking-[0.08em] text-cobalt"
            title="You're on Dormscape Pro"
            aria-label="Pro"
          >
            Pro
          </span>
        )}
      </span>
    </Link>
  );
}
