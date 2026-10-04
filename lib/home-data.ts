import { SCHOOLS } from "@/lib/schools";
import {
  FLEX_CREDIT_PRICE_USD,
  PLUS_INITIAL_CREDITS,
  PLUS_PRICE_USD,
  PLUS_PRICE_WAS_USD,
  PRO_INITIAL_CREDITS,
  PRO_PRICE_USD,
  PRO_PRICE_WAS_USD,
  RECHARGE_CREDITS,
  RECHARGE_PRICE_USD,
} from "@/lib/plan";
import { STYLES } from "@/lib/styles";
import type { StyleId } from "@/lib/types";

/** Counts straight from the shipped school data, so they never drift. */
export const SCHOOL_COUNT = SCHOOLS.length;
export const HALL_COUNT = SCHOOLS.reduce((n, s) => n + s.dorms.length, 0);
export const LAYOUT_COUNT = SCHOOLS.reduce(
  (n, s) => n + s.dorms.reduce((m, d) => m + d.rooms.length, 0),
  0
);

/** 16.42 → "16′5″" */
export function feetInches(ft: number): string {
  let whole = Math.floor(ft);
  let inches = Math.round((ft - whole) * 12);
  if (inches === 12) {
    whole += 1;
    inches = 0;
  }
  return `${whole}′${inches}″`;
}

export interface FeaturedRoom {
  school: string;
  hall: string;
  type: string;
  lengthFt: number;
  widthFt: number;
  sqft: number;
  href: string;
}

/**
 * Twelve real rooms for the homepage, all with sizes the school publishes
 * (no estimates). A pick that drops out of the data is skipped, never faked.
 */
const PICKS: [schoolId: string, dormId: string, type: string, label: string][] = [
  ["penn-state", "atherton-hall", "double", "Penn State"],
  ["university-of-michigan", "alice-lloyd-hall", "double", "Michigan"],
  ["ohio-state", "baker-hall-east", "double", "Ohio State"],
  ["rutgers", "brett-hall", "double", "Rutgers"],
  ["ucla", "dykstra-hall", "double", "UCLA"],
  ["uga", "boggs-hall", "double", "Georgia"],
  ["georgia-tech", "armstrong", "double_traditional", "Georgia Tech"],
  ["cornell", "clara-dickson-hall", "double", "Cornell"],
  ["unc", "alderman", "double", "UNC"],
  ["virginia-tech", "hoge", "double", "Virginia Tech"],
  ["university-of-alabama", "burke", "double", "Alabama"],
  ["northwestern", "elder-hall", "double", "Northwestern"],
];

export const FEATURED_ROOMS: FeaturedRoom[] = PICKS.flatMap(([schoolId, dormId, type, label]) => {
  const school = SCHOOLS.find((s) => s.id === schoolId);
  const dorm = school?.dorms.find((d) => d.id === dormId);
  const room = dorm?.rooms.find(
    (r) => r.type === type && r.length_ft && r.width_ft && !r.dims_estimated
  );
  if (!school || !dorm || !room || !room.length_ft || !room.width_ft) return [];
  const lengthFt = Math.max(room.length_ft, room.width_ft);
  const widthFt = Math.min(room.length_ft, room.width_ft);
  return [{
    school: label,
    hall: dorm.name,
    type: room.label || room.type,
    lengthFt,
    widthFt,
    sqft: room.sqft ?? Math.round(lengthFt * widthFt),
    href: `/colleges/${school.id}/${dorm.id}`,
  }];
});

/** Live copy for each vibe, plus the card colors from the design. */
const VIBE_COPY: Record<string, { line: string; rule: string; dots: [string, string, string] }> = {
  minimalist: { line: "Clean lines, empty desk, nothing you don't need.", rule: "#16161D", dots: ["#1B1B1B", "#DADAD3", "#FFFFFF"] },
  cozy: { line: "Warm light, soft layers, film photos on string.", rule: "#C8834F", dots: ["#C8834F", "#F4E4CC", "#7B4A2C"] },
  preppy: { line: "Stripes, monograms, made-bed energy.", rule: "#16244F", dots: ["#16244F", "#FFB3CE", "#2E7A57"] },
  academia: { line: "Warm library light, plaid, brass, and old books.", rule: "#6E1F22", dots: ["#6E1F22", "#3E4A35", "#C9A55C"] },
  y2k: { line: "Chrome, holo posters, butterfly-clip everything.", rule: "#7C6CFF", dots: ["#A6F0FF", "#FF63D2", "#7C6CFF"] },
  gamer: { line: "Dual glow, clean cable runs, zero screen glare.", rule: "#15152A", dots: ["#27F3FF", "#FF2E88", "#15152A"] },
  team_spirit: { line: "Varsity stripes, color-block, game-day ready.", rule: "#B5122F", dots: ["#B5122F", "#15284B", "#F4C430"] },
  retro: { line: "Mustard and rust, groovy shapes, 70s warmth.", rule: "#D65F1C", dots: ["#D65F1C", "#F2C14E", "#4E6B3A"] },
  pastel: { line: "Soft pinks, plush everything, gently unserious.", rule: "#CDB9FF", dots: ["#FFB3D1", "#CDB9FF", "#BDF0DA"] },
};

export const HOME_VIBES = STYLES.map((s) => ({
  id: s.id as StyleId,
  name: s.name,
  plus: Boolean(s.plus),
  ...(VIBE_COPY[s.id] ?? { line: "", rule: "#16161D", dots: [s.palette[3], s.palette[1], s.palette[0]] as [string, string, string] }),
}));

const usd = (n: number) => `$${n.toFixed(2)}`;

/** Pricing card copy. Prices and credits come from lib/plan.ts. */
export const PRICING = {
  free: {
    name: "Free",
    price: "$0",
    note: "Forever",
    tag: "No card needed",
    line: "Try it with one room.",
    perks: [
      "Real room dimensions for supported schools",
      "1 generated room plan to try it out",
      "3 vibes: Minimalist, Cozy Aesthetic, Preppy",
      "Budget-aware picks with live Amazon links",
      "Drag-and-drop 2D layout that fits to the inch",
      "Save your designs and share them with a link",
      "No account needed to start planning",
    ],
  },
  plus: {
    name: "Plus",
    price: usd(PLUS_PRICE_USD),
    was: usd(PLUS_PRICE_WAS_USD),
    note: "One time",
    tag: "All 9 vibes",
    line: "You'll have more than one good idea.",
    perks: [
      "Everything in Free",
      `${PLUS_INITIAL_CREDITS} plan credits; recharge ${RECHARGE_CREDITS} more for ${usd(RECHARGE_PRICE_USD)}`,
      "All 9 vibes",
      "Draw your own room",
      "Add your own products",
      "PDF and PNG export",
      "Compare two designs side by side",
      "Priority on add-my-school requests",
    ],
  },
  pro: {
    name: "Pro",
    price: usd(PRO_PRICE_USD),
    was: usd(PRO_PRICE_WAS_USD),
    note: "One time",
    tag: "Includes 3D",
    line: "Your room, in 3D.",
    perks: [
      "Everything in Plus",
      `${PRO_INITIAL_CREDITS} plan credits; top up for ${usd(FLEX_CREDIT_PRICE_USD)} each`,
      "My Room: one shared room for up to four people",
      "3D Room Builder",
      "Live 3D Room Studio",
      "Create your own vibe",
      "One payment unlocks Pro tools for good",
    ],
  },
} as const;
