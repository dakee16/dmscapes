"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { isPlus } from "@/lib/plan";

/**
 * The Dormscape wordmark. The Plus "+" is rendered here, inside the logo
 * component itself, so it appears in every header a Plus member sees and is
 * never editable as loose page text. Free users just see "dormscape".
 */
export default function Wordmark({
  textClassName = "text-lg",
}: {
  textClassName?: string;
}) {
  const { profile } = useAuth();
  const plus = isPlus(profile);

  return (
    <Link href="/" className="shrink-0" aria-label={plus ? "Dormscape Plus home" : "Dormscape home"}>
      <span className={`font-display font-bold tracking-tight ${textClassName}`}>
        dorm<span className="text-amber">scape</span>
        {plus && (
          <span
            className="ml-0.5 text-cobalt"
            title="You're on Dormscape Plus"
            aria-label="Plus"
          >
            +
          </span>
        )}
      </span>
    </Link>
  );
}
