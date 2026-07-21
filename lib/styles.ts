import type { StyleId } from "./types";

export interface StyleMeta {
  id: StyleId;
  name: string;
  emoji: string;
  keywords: string[];
  /** Reference palette for the style (thumbnails now come from StyleScene). */
  palette: [string, string, string, string];
}

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
    id: "gamer",
    name: "Gamer",
    emoji: "🎮",
    keywords: ["RGB", "blackout", "battle station", "neon"],
    palette: ["#0d0d17", "#3b3b4f", "#7c3aed", "#22d3ee"],
  },
  {
    id: "boho",
    name: "Boho",
    emoji: "🪴",
    keywords: ["rattan", "macrame", "plants", "earthy"],
    palette: ["#f5ecdf", "#d9a45b", "#a8763e", "#5f7355"],
  },
  {
    id: "preppy",
    name: "Preppy",
    emoji: "🎀",
    keywords: ["pink & green", "gingham", "gold", "bows"],
    palette: ["#ffd1dc", "#ff7ba9", "#7fb069", "#f5c451"],
  },
  {
    id: "team_spirit",
    name: "Team Spirit",
    emoji: "🏆",
    keywords: ["varsity stripes", "color-block", "game day"],
    palette: ["#f4f6fb", "#c8102e", "#0b1f3a", "#f5f5f5"],
  },
];

export const styleById = (id: StyleId): StyleMeta =>
  STYLES.find((s) => s.id === id) ?? STYLES[0];

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
