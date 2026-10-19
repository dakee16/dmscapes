// A pilot school's sample week for the static Hall Finder map cards (homepage, college
// page band, planner callout), from data/campus/sketch.json (scripts/campus/sketch.mjs).
// Kept out of lib/hall-finder.ts so the nav and footer don't carry the JSON.
import SKETCH from "@/data/campus/sketch.json";
import type { Example } from "@/components/hall-finder/Entry";

export function exampleFor(collegeId: string, short: string): Example | null {
  const s = (SKETCH as Record<string, { halls: number; top: Example["top"] }>)[collegeId];
  return s ? { collegeId, short, halls: s.halls, top: s.top } : null;
}
