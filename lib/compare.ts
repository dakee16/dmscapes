import RAW from "@/data/compare.json";
import { HALL_COUNT, SCHOOL_COUNT } from "@/lib/home-data";
import { FREE_PLAN_CAP, PLUS_PRICE_USD, PRO_PRICE_USD } from "@/lib/plan";

/**
 * Other dorm room planners, for /compare. Their facts come only from their own
 * pages (quoted in data/compare.json, checked on the date given); dormscape's
 * column comes from the code, so prices and counts can't drift.
 */
export interface Competitor {
  slug: string;
  name: string;
  url: string;
  checked: string;
  summary: string;
  how_it_works: string;
  facts: {
    account_to_start: boolean | null;
    free_tier: string | null;
    pricing: { plan: string; price: string; billing: string }[];
    dorm_dimensions_preloaded: boolean | null;
    to_scale_plan: boolean | null;
    three_d: boolean | null;
    ai_photo_render: boolean | null;
    shopping: string | null;
    roommate_collaboration: boolean | null;
    platforms: string[];
  };
  sources: { url: string; quote: string }[];
  /** something we saw ourselves when trying it, dated */
  observed?: string;
}

export const COMPETITORS = RAW as Competitor[];

export function competitor(slug: string): Competitor | undefined {
  return COMPETITORS.find((c) => c.slug === slug);
}

/** Short display name ("101 Planners", not the tool's full title). */
export function shortCompetitorName(c: Competitor): string {
  return c.name.replace(/ Dorm Room Planner$/, "");
}

/** Where each one is the better pick, in their favour, from their sourced facts. */
export const STRENGTHS: Record<string, string[]> = {
  meltflex: [
    "You want a photo-realistic picture of your own room photo, restyled by AI.",
    "You want shoppable furniture from retailers beyond Amazon, such as IKEA and Wayfair.",
    "You want a phone app as well as the website.",
  ],
  "planner-5d": [
    "You want a full home design tool for more rooms than a dorm.",
    "You want native apps on phones, tablets and desktop.",
    "You want to restyle a photo of your room with AI as well as plan it.",
  ],
  spoak: [
    "You enjoy designing: mood boards, room mockups and a design community.",
    "You want to import products from any store into your plan.",
  ],
  "101planners": [
    "You want a simple drag-and-drop plan that's free with no sign-up at all.",
    "You'd rather print or send your plan as a PDF than shop from it.",
  ],
};

/** Where dormscape fits better, from its own features. */
export const DORMSCAPE_STRENGTHS = [
  `Your school is one of the ${SCHOOL_COUNT} on dormscape: your actual room is drawn to scale from the size your housing office publishes.`,
  "You want a layout that fits and a shopping list matched to your budget, in one go.",
  "You want to settle who brings what with your roommate before move-in.",
  "You'd rather pay once than subscribe.",
];

const yes = (v: boolean | null, y = "Yes", n = "No") => (v === null ? "Not stated" : v ? y : n);
const usd = (n: number) => `$${n.toFixed(2)}`;

/** The comparison table: [what, dormscape, them]. */
export function compareRows(c: Competitor): [string, string, string][] {
  const f = c.facts;
  const pricing = f.pricing.length ? f.pricing.map((p) => `${p.plan}: ${p.price}`).join("; ") : "No paid plans listed";
  return [
    ["Real room sizes for your residence hall", `Yes, ${HALL_COUNT.toLocaleString("en-US")} halls at ${SCHOOL_COUNT} schools`, yes(f.dorm_dimensions_preloaded)],
    ["To-scale floor plan", "Yes", yes(f.to_scale_plan)],
    ["3D view", "Yes, with Pro", yes(f.three_d)],
    ["AI redesign of a room photo", "No", yes(f.ai_photo_render)],
    ["Shopping", "Budget-matched picks with live Amazon links", f.shopping ?? "Not stated"],
    ["Planning with roommates", "Share any room with a link; a shared room for up to four with Pro", yes(f.roommate_collaboration)],
    ["Account to start", "No. Sign in free to generate and save", yes(f.account_to_start)],
    ["Free", `${FREE_PLAN_CAP} generated room plan, the 2D editor and three vibes; saving is free`, f.free_tier ?? "Not stated"],
    ["Paid", `Plus ${usd(PLUS_PRICE_USD)} or Pro ${usd(PRO_PRICE_USD)}, one time, no subscription`, pricing],
    [
      "Platforms",
      "Web, on any device",
      f.platforms.length ? f.platforms.map((p) => (p === "ios" ? "iOS" : p === "macos" ? "macOS" : p[0].toUpperCase() + p.slice(1))).join(", ") : "Not stated",
    ],
  ];
}

/** "Oct 28, 2026" */
export function checkedOn(c: Competitor): string {
  return new Date(`${c.checked}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}
