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
    <Link
      href="/"
      className="flex shrink-0 items-center gap-2"
      aria-label={plus ? "Dormscape Plus home" : "Dormscape home"}
    >
      {/* The brand mark. A static PNG served from /public; rendered as a small
          rounded badge so its baked-in graph-paper backdrop reads as an app
          icon against the header. eslint-disable: a fixed-size logo doesn't
          need next/image's responsive machinery. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icons/icon-512.png"
        alt=""
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-[9px] border border-ink/10"
      />
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
