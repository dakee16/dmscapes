"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "@/components/ds/Icons";

/** localStorage: the last school a student opened the finder for (HallFinder writes it). */
export const LAST_SCHOOL_KEY = "dormscape-hall-finder-last";

/** "Continue with Penn State" on /hall-finder, for whoever has used the finder before. */
export default function LastSchool({ names }: { names: Record<string, string> }) {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    try {
      const last = localStorage.getItem(LAST_SCHOOL_KEY);
      if (last && names[last]) setId(last);
    } catch {}
  }, [names]);
  if (!id) return null;
  return (
    <p style={{ margin: "18px 0 0" }}>
      <Link href={`/colleges/${id}/hall-finder`} className="ds-btn ds-btn--ink-yellow">
        Continue with {names[id]} <ArrowRight />
      </Link>
    </p>
  );
}
