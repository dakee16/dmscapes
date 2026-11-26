"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "@/lib/analytics";

/** A link to a seasonal vibe (/plan?vibe=holiday) that tells PostHog where it was clicked. */
export default function SeasonLink({ vibe, where, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & {
  vibe: "spooky" | "holiday";
  where: "hero" | "tape" | "404";
}) {
  return (
    <Link
      href={`/plan?vibe=${vibe}`}
      {...props}
      onClick={(e) => {
        track("season_cta_clicked", { where, vibe });
        onClick?.(e);
      }}
    />
  );
}
