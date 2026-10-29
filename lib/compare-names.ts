/**
 * The /compare/[slug] pages by name, for the footer. lib/compare holds the full,
 * quoted data; this stays small because the footer renders on some client pages.
 * scripts/check-tools.cjs checks it against data/compare.json.
 */
export const COMPARE_NAMES: { slug: string; name: string }[] = [
  { slug: "meltflex", name: "MeltFlex" },
  { slug: "planner-5d", name: "Planner 5D" },
  { slug: "spoak", name: "Spoak" },
  { slug: "101planners", name: "101 Planners" },
];
