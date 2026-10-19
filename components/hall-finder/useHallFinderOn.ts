"use client";

import { useEffect, useState } from "react";
import { hallFinderLive, hallFinderOn } from "@/lib/hall-finder";

/**
 * Whether Hall Finder entry points show: live (server and client agree, so they're in
 * the static HTML), or this tab saw ?hallfinder=preview (client only, after mount, so
 * a static page never links to the dark finder).
 */
export function useHallFinderOn(): boolean {
  const [on, setOn] = useState(hallFinderLive);
  useEffect(() => setOn(hallFinderOn()), []);
  return on;
}
