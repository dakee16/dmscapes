import type { StyleId } from "./types";

export type RugPattern = "stripes" | "plaid" | "arcs" | "fuzzy" | "neon" | "plain";

/**
 * How the 2D planner's Room view dresses a vibe: the floor boards, the wood of
 * the student's own furniture, bedding and soft goods, an accent for chairs and
 * lamps, the colour of lamplight, and the rug.
 */
export interface RoomTheme {
  floor: string;
  floorAlt: string;
  wood: string;
  woodDark: string;
  textile: string;
  textileAlt: string;
  accent: string;
  glow: string;
  rug: { pattern: RugPattern; base: string; line: string };
}

export interface StyleMeta {
  id: StyleId;
  name: string;
  keywords: string[];
  /** Reference palette for the style (thumbnails now come from StyleScene). */
  palette: [string, string, string, string];
  /** True when the style is gated behind Dormscape Plus. */
  plus?: boolean;
  /** The Room view theme; styles without one derive it from `palette`. */
  room?: RoomTheme;
}

/** Blend two #rrggbb colours: t = 0 gives a, 1 gives b. */
export function mixHex(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [x, y] = [p(a), p(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

/** A believable room from any four-colour palette (light → dark): honey-oak boards, the palette on the soft goods. */
export function roomThemeFromPalette([p0, p1, p2, p3]: readonly string[]): RoomTheme {
  return {
    floor: mixHex("#DDBF92", p0, 0.25),
    floorAlt: mixHex("#D2B282", p0, 0.2),
    wood: mixHex("#B98A57", p2, 0.2),
    woodDark: mixHex("#86603A", p3, 0.25),
    textile: mixHex(p0, "#FFFFFF", 0.3),
    textileAlt: p1,
    accent: p2,
    glow: "#FFDDA6",
    rug: { pattern: "plain", base: p1, line: mixHex(p1, p3, 0.35) },
  };
}

// Free styles come first, then the four Plus-gated styles. The picker and the
// homepage showcase render in this order and read `plus` to draw the badge.
// Boho was retired from selection (see RETIRED_STYLES below); it is intentionally
// absent here so it can no longer be chosen for a new design.
export const STYLES: StyleMeta[] = [
  {
    id: "minimalist",
    name: "Minimalist",
    keywords: ["clean", "neutral", "uncluttered", "calm"],
    palette: ["#fafaf8", "#d6d3cd", "#8a8a94", "#17172b"],
    room: { floor: "#E8DBC4", floorAlt: "#E0D1B7", wood: "#DCC7A4", woodDark: "#A88D66", textile: "#FBFAF7", textileAlt: "#D6D3CD", accent: "#2A2A33", glow: "#FFF1D9", rug: { pattern: "plain", base: "#CFCCC6", line: "#B4B0A9" } },
  },
  {
    id: "cozy",
    name: "Cozy Aesthetic",
    keywords: ["warm", "soft", "fairy lights", "layered"],
    palette: ["#f3e9dc", "#d9b99b", "#a9836a", "#6d4c35"],
    room: { floor: "#E2BC88", floorAlt: "#D8AF78", wood: "#B98756", woodDark: "#86603A", textile: "#F4EADC", textileAlt: "#E6D3B9", accent: "#C4683F", glow: "#FFD49A", rug: { pattern: "stripes", base: "#C96C45", line: "#E8A27B" } },
  },
  {
    id: "preppy",
    name: "Preppy",
    keywords: ["pink & green", "gingham", "gold", "bows"],
    palette: ["#ffd1dc", "#ff7ba9", "#7fb069", "#f5c451"],
    room: { floor: "#EEE6DC", floorAlt: "#E6DCCF", wood: "#F3EEE7", woodDark: "#C9BBA8", textile: "#FFD1DC", textileAlt: "#8DBB76", accent: "#FF7BA9", glow: "#FFE7B5", rug: { pattern: "stripes", base: "#FF9DBC", line: "#FFFFFF" } },
  },
  {
    id: "academia",
    name: "Academia",
    keywords: ["brass & wood", "plaid", "leather-look", "vintage"],
    palette: ["#efe4cb", "#c69a4f", "#7c5230", "#2f2115"],
    room: { floor: "#7A5434", floorAlt: "#6F4B2D", wood: "#8E623D", woodDark: "#4F321D", textile: "#EFE4CB", textileAlt: "#C69A4F", accent: "#3F5A3A", glow: "#F2C46B", rug: { pattern: "plaid", base: "#4C6B44", line: "#8A5A33" } },
    plus: true,
  },
  {
    id: "y2k",
    name: "Y2K Cyber",
    keywords: ["chrome", "holographic", "hot pink", "early 2000s"],
    palette: ["#f3e8ff", "#ff4fd8", "#7b5cff", "#b8c6d6"],
    room: { floor: "#E6E1EE", floorAlt: "#DDD7E8", wood: "#DCE2EA", woodDark: "#9DA8B8", textile: "#FF9FE5", textileAlt: "#9C86FF", accent: "#B8C6D6", glow: "#F6CCFF", rug: { pattern: "plain", base: "#F3E8FF", line: "#E0C8FF" } },
    plus: true,
  },
  {
    id: "gamer",
    name: "Gamer",
    keywords: ["RGB", "blackout", "battle station", "neon"],
    palette: ["#0d0d17", "#3b3b4f", "#7c3aed", "#22d3ee"],
    room: { floor: "#2E2E38", floorAlt: "#282832", wood: "#3D3D50", woodDark: "#1C1C26", textile: "#2A2A40", textileAlt: "#7C3AED", accent: "#7C3AED", glow: "#22D3EE", rug: { pattern: "neon", base: "#1B1B25", line: "#22D3EE" } },
    plus: true,
  },
  {
    id: "team_spirit",
    name: "Team Spirit",
    keywords: ["varsity stripes", "color-block", "game day"],
    palette: ["#f4f6fb", "#c8102e", "#0b1f3a", "#f5f5f5"],
    room: { floor: "#E5C795", floorAlt: "#DCBB86", wood: "#D3AC74", woodDark: "#9E7644", textile: "#C8102E", textileAlt: "#0B1F3A", accent: "#C8102E", glow: "#FFE2A6", rug: { pattern: "stripes", base: "#0B1F3A", line: "#C8102E" } },
    plus: true,
  },
  {
    id: "retro",
    name: "Retro",
    keywords: ["70s", "mustard", "groovy", "earth tones"],
    palette: ["#f2ddb5", "#e08a2e", "#a8471f", "#6b7f3a"],
    room: { floor: "#B9774A", floorAlt: "#AD6C40", wood: "#C88A55", woodDark: "#7F4722", textile: "#E2AA34", textileAlt: "#A8471F", accent: "#6B7F3A", glow: "#FFC478", rug: { pattern: "arcs", base: "#E2AA34", line: "#A8471F" } },
    plus: true,
  },
  {
    id: "pastel",
    name: "Pastel",
    keywords: ["soft pastel", "plush", "cute", "gentle"],
    palette: ["#ffe9f2", "#ffd1e8", "#c8b6ff", "#bde0fe"],
    room: { floor: "#F7ECEE", floorAlt: "#F1E3E7", wood: "#F4E8EE", woodDark: "#D5BDC8", textile: "#CDBBFF", textileAlt: "#FFD1E8", accent: "#BDE0FE", glow: "#FFEFF6", rug: { pattern: "fuzzy", base: "#FFD6EA", line: "#F4B8D6" } },
    plus: true,
  },
];

// Styles removed from selection but kept for lookup so existing saved designs
// (saved list, comparison, /room/[id] share links, PDF export) still render with
// their real name and palette. Never shown in the picker or showcase.
export const RETIRED_STYLES: StyleMeta[] = [
  {
    id: "boho",
    name: "Boho",
    keywords: ["rattan", "macrame", "plants", "earthy"],
    palette: ["#f5ecdf", "#d9a45b", "#a8763e", "#5f7355"],
  },
];

// "Create your own vibe" (Pro). A pseudo-style: resolvable for display, saves,
// share links, and comparison, but deliberately NOT in STYLES so it never
// appears in the picker grid (the page renders its own distinct tile) and the
// homepage showcase skips it. Its real display name is the user's vibe text,
// supplied per-design; `name` here is only the fallback label.
export const CUSTOM_STYLE: StyleMeta = {
  id: "custom",
  name: "Create your own",
  keywords: ["your words", "live-matched"],
  palette: ["#eef1ff", "#c7d2fe", "#2b4eff", "#17172b"],
  room: roomThemeFromPalette(["#eef1ff", "#c7d2fe", "#2b4eff", "#17172b"]),
};

export const isCustomStyle = (id: StyleId): boolean => id === "custom";

/**
 * Display name for a design wherever a style name would show (result subtitle,
 * saved-designs list, comparison, share page, PDF). A custom design has no named
 * style, so its own vibe text stands in; a saved custom design passes its stored
 * name (which is the vibe). Falls back to the style's name for curated designs.
 */
export function designDisplayName(id: StyleId, vibe?: string | null): string {
  if (id === "custom") return vibe?.trim() || "Your custom vibe";
  return styleById(id).name;
}

// Every style id the app recognizes: currently selectable, retired, plus the
// custom pseudo-style. Server-side validation (saving a design) accepts this
// full set so a saved legacy or custom design reopened in the planner re-saves.
const ALL_STYLES: StyleMeta[] = [...STYLES, ...RETIRED_STYLES, CUSTOM_STYLE];

/** Every valid StyleId, including retired styles (for server-side validation). */
export const ALL_STYLE_IDS: StyleId[] = ALL_STYLES.map((s) => s.id);

/** The Plus-gated style ids. Selecting one as a free user opens the upgrade modal. */
export const PLUS_STYLES: ReadonlySet<StyleId> = new Set<StyleId>(
  STYLES.filter((s) => s.plus).map((s) => s.id)
);

/** Whether a style is gated behind Dormscape Plus. */
export const isPlusStyle = (id: StyleId): boolean => PLUS_STYLES.has(id);

/** Resolve any known style (selectable or retired) for display. */
export const styleById = (id: StyleId): StyleMeta =>
  ALL_STYLES.find((s) => s.id === id) ?? STYLES[0];

// Retired styles carry no theme of their own; derive theirs once so the object stays stable.
const DERIVED_ROOMS = new Map(ALL_STYLES.filter((s) => !s.room).map((s) => [s.id, roomThemeFromPalette(s.palette)]));

/** The Room view theme for any style id; unknown ids fall back to minimalist. */
export const roomTheme = (id: StyleId | null | undefined): RoomTheme => {
  const s = styleById(id ?? "minimalist");
  return s.room ?? DERIVED_ROOMS.get(s.id)!;
};

/** Canvas fill colors per catalog color_category (matches templates/README.md). */
export const CATEGORY_COLORS: Record<string, string> = {
  bed: "#6366f1", // indigo
  desk: "#10b981", // emerald
  dresser: "#f59e0b", // amber
  rug: "#ec4899", // pink
  storage: "#f97316", // orange
  lighting: "#eab308", // yellow
  decor: "#a855f7", // purple
};
