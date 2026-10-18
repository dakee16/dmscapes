"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track } from "@/lib/analytics";

/** A link to the Spooky Season vibe (/plan?vibe=spooky) that tells PostHog where it was clicked. */
export default function SeasonLink({ where, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { where: "hero" | "tape" | "404" }) {
  return (
    <Link
      href="/plan?vibe=spooky"
      {...props}
      onClick={(e) => {
        track("season_cta_clicked", { where });
        onClick?.(e);
      }}
    />
  );
}
