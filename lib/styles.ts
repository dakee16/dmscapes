import type { StyleId } from "./types";

export interface StyleMeta {
  id: StyleId;
  name: string;
  emoji: string;
  keywords: string[];
  /** Reference palette for the style (thumbnails now come from StyleScene). */
  palette: [string, string, string, string];
  /** True when the style is gated behind Dormscape Plus. */
  plus?: boolean;
}

// Free styles come first, then the four Plus-gated styles. The picker and the
// homepage showcase render in this order and read `plus` to draw the badge.
// Boho was retired from selection (see RETIRED_STYLES below); it is intentionally
// absent here so it can no longer be chosen for a new design.
export const STYLES: StyleMeta[] = [
  {
    id: "minimalist",
    name: "Minimalist",
    emoji: "⬜",
    keywords: ["clean", "neutral", "uncluttered", "calm"],
    palette: ["#fafaf8", "#d6d3cd", "#8a8a94", "#17172b"],
  },
  {
    id: "cozy",
    name: "Cozy Aesthetic",
    emoji: "🕯️",
    keywords: ["warm", "soft", "fairy lights", "layered"],
    palette: ["#f3e9dc", "#d9b99b", "#a9836a", "#6d4c35"],
  },
  {
    id: "preppy",
    name: "Preppy",
    emoji: "🎀",
    keywords: ["pink & green", "gingham", "gold", "bows"],
    palette: ["#ffd1dc", "#ff7ba9", "#7fb069", "#f5c451"],
  },
  {
    id: "academia",
    name: "Academia",
    emoji: "📚",
    keywords: ["brass & wood", "plaid", "leather-look", "vintage"],
    palette: ["#efe4cb", "#c69a4f", "#7c5230", "#2f2115"],
    plus: true,
  },
  {
    id: "y2k",
    name: "Y2K Cyber",
    emoji: "💿",
    keywords: ["chrome", "holographic", "hot pink", "early 2000s"],
    palette: ["#f3e8ff", "#ff4fd8", "#7b5cff", "#b8c6d6"],
    plus: true,
  },
  {
    id: "gamer",
    name: "Gamer",
    emoji: "🎮",
    keywords: ["RGB", "blackout", "battle station", "neon"],
    palette: ["#0d0d17", "#3b3b4f", "#7c3aed", "#22d3ee"],
    plus: true,
  },
  {
    id: "team_spirit",
    name: "Team Spirit",
    emoji: "🏆",
    keywords: ["varsity stripes", "color-block", "game day"],
    palette: ["#f4f6fb", "#c8102e", "#0b1f3a", "#f5f5f5"],
    plus: true,
  },
  {
    id: "retro",
    name: "Retro",
    emoji: "🕺",
    keywords: ["70s", "mustard", "groovy", "earth tones"],
    palette: ["#f2ddb5", "#e08a2e", "#a8471f", "#6b7f3a"],
    plus: true,
  },
  {
    id: "pastel",
    name: "Pastel",
    emoji: "🧸",
    keywords: ["soft pastel", "plush", "cute", "gentle"],
    palette: ["#ffe9f2", "#ffd1e8", "#c8b6ff", "#bde0fe"],
    plus: true,
  },
];

// Styles removed from selection but kept for lookup so existing saved designs
// (saved list, comparison, /room/[id] share links, PDF export) still render with
// their real name, emoji, and palette. Never shown in the picker or showcase.
export const RETIRED_STYLES: StyleMeta[] = [
  {
    id: "boho",
    name: "Boho",
    emoji: "🪴",
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
  emoji: "✨",
  keywords: ["your words", "live-matched"],
  palette: ["#eef1ff", "#c7d2fe", "#2b4eff", "#17172b"],
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
