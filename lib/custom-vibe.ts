// "Create your own vibe" (Pro-exclusive), shared, secret-free logic used by
// both the Step 2 UI and the /api/vibe/generate route.
//
// STATUS: v1 ships behind the NEXT_PUBLIC_CUSTOM_VIBE flag (default OFF) and is
// mock-backed. Two real integrations must be wired before it can go live:
//   1. Amazon Creators API (OAuth client-credentials), see lib/creators-api.ts.
//   2. (optional) An LLM for validation + query generation, the deterministic
//      functions below are the v1 implementation, each with a clearly marked
//      seam where a Claude call drops in. Nothing here calls a model yet.
import type { ProductCategory } from "./types";

/** Feature flag. Unset/anything-but-"1" keeps the whole feature invisible, so a
 *  half-wired pipeline can never reach real users by accident. Enable locally
 *  with NEXT_PUBLIC_CUSTOM_VIBE=1 in .env.local. */
export const CUSTOM_VIBE_ENABLED = process.env.NEXT_PUBLIC_CUSTOM_VIBE === "1";

/** The pseudo-style id for a custom vibe. Registered in lib/styles.ts so saves,
 *  share links, and comparison accept it, but never shown in the picker grid. */
export const CUSTOM_STYLE_ID = "custom" as const;

/** Placeholder shown in the vibe input. Models the level of detail that works. */
export const VIBE_PLACEHOLDER =
  "coastal grandmother energy, lots of linen and soft blues";

/** Tap-to-fill inspiration. Chosen to span very different aesthetics so the set
 *  reads as "anything goes," not a menu of presets. */
export const INSPIRATION_CHIPS: readonly string[] = [
  "warm minimalist, oak, cream, and a single big plant",
  "dark academia, leather, brass, and deep green",
  "cottagecore florals with gingham and warm light",
  "chrome-and-neon gamer battlestation, all blackout",
];

/** Loading lines cycled while the (slower) live pipeline runs. Narrative, in
 *  order of what's actually happening, so the wait reads as progress. */
export const VIBE_LOADING_LINES: readonly string[] = [
  "Reading your vibe…",
  "Picking colors and textures…",
  "Searching for the right pieces…",
  "Matching your budget…",
  "Arranging your room…",
];

// ---------------------------------------------------------------------------
// Input validation gate (deterministic v1, Claude-ready seam)
// ---------------------------------------------------------------------------
// A plausible room aesthetic mentions at least one thing you can furnish a room
// with: a color, a material/texture, a mood, or a named aesthetic. This is a
// lightweight, zero-cost gate that runs before any downstream API call. To make
// it a model call instead, replace the body of validateVibe with a fast Claude
// classification (e.g. "Is this a room/interior aesthetic? yes/no") and keep the
// same {ok, message} return shape, nothing else changes.

const AESTHETIC_LEXICON: readonly string[] = [
  // colors
  "white", "black", "grey", "gray", "cream", "beige", "tan", "brown", "blue",
  "navy", "teal", "green", "sage", "olive", "mint", "yellow", "mustard", "gold",
  "orange", "terracotta", "rust", "red", "maroon", "pink", "blush", "rose",
  "purple", "lilac", "lavender", "pastel", "neon", "chrome", "silver", "earth",
  "monochrome", "colorful", "neutral", "warm", "cool", "dark", "bright", "muted",
  // materials / textures
  "linen", "cotton", "wool", "velvet", "leather", "wood", "oak", "walnut",
  "rattan", "wicker", "bamboo", "metal", "brass", "marble", "glass", "plush",
  "fuzzy", "knit", "woven", "matte", "glossy", "textured", "soft", "cozy",
  "fluffy", "shag", "faux",
  // moods / aesthetics
  "minimal", "minimalist", "maximal", "maximalist", "modern", "vintage",
  "retro", "boho", "bohemian", "coastal", "beachy", "rustic", "industrial",
  "scandi", "scandinavian", "japandi", "cottagecore", "academia", "preppy",
  "grunge", "moody", "airy", "calm", "serene", "whimsical", "elegant", "chic",
  "edgy", "y2k", "cyber", "gamer", "aesthetic", "vibe", "energy", "core",
  "clean", "cluttered", "layered", "eclectic", "feminine", "masculine",
  // room / decor nouns
  "room", "dorm", "bedroom", "space", "decor", "lights", "plants",
  "plant", "rug", "bedding", "posters", "tapestry", "shelf", "shelves",
  "furniture", "desk", "comfy", "homey", "grandmother", "grandma", "granny",
];

const LEXICON_SET = new Set(AESTHETIC_LEXICON);

const FAIL_MESSAGE =
  "That doesn't sound like a room aesthetic yet. Try describing colors, textures, or a mood, like \"warm minimalist with oak and cream.\"";

export interface VibeValidation {
  ok: boolean;
  /** Present only when ok is false. Warm, specific, and actionable. */
  message?: string;
}

/** Whether a free-text description reads as a plausible room aesthetic. */
export function validateVibe(raw: string): VibeValidation {
  const text = raw.trim().toLowerCase();
  if (text.length < 3) return { ok: false, message: FAIL_MESSAGE };
  // Reject a lone URL / code-looking blob, clearly not a described aesthetic.
  if (/^https?:\/\//.test(text) || /[<>{}]/.test(text)) {
    return { ok: false, message: FAIL_MESSAGE };
  }
  const words = text.split(/[^a-z]+/).filter(Boolean);
  if (words.length === 0) return { ok: false, message: FAIL_MESSAGE };
  // Plausible if any word (or its "-core"/"-y" root) is an aesthetic signal.
  const hit = words.some((w) => {
    if (LEXICON_SET.has(w)) return true;
    if (w.endsWith("core") && LEXICON_SET.has(w.slice(0, -4))) return true;
    if (w.endsWith("y") && LEXICON_SET.has(w.slice(0, -1))) return true;
    return false;
  });
  return hit ? { ok: true } : { ok: false, message: FAIL_MESSAGE };
}

/** Soft, non-blocking guidance shown under the input as the user types. Never a
 *  hard gate, just nudges toward enough detail for good matches. */
export function vibeHelper(raw: string): string {
  const len = raw.trim().length;
  if (len === 0) return "A sentence or two works best, colors, textures, a mood.";
  if (len < 15) return "A little more detail gets better matches.";
  return "Nice, that's plenty to work with.";
}

// ---------------------------------------------------------------------------
// Query generation (deterministic v1, Claude-ready seam)
// ---------------------------------------------------------------------------
// Turns a vibe into one Amazon search query per core product category. The v1
// mapping is deterministic: pull descriptive tokens out of the vibe and prepend
// them to a per-category base term. To upgrade, replace generateVibeQueries with
// a single Claude call that returns { [category]: query } and keep this as the
// fallback, the /api/vibe/generate route already treats the result as opaque.

/** The 15 core categories a plan is built from (mirrors CATEGORY_ORDER in
 *  lib/catalog.ts; kept here so the pipeline has no client/secret dependency). */
export const CORE_VIBE_CATEGORIES: readonly ProductCategory[] = [
  "bedding", "rug", "desk_lamp", "ambient_lighting", "wall_decor", "storage",
  "throw", "curtains", "desk_accessories", "mirror", "laundry_hamper",
  "power_strip", "trash_can", "towel_caddy", "accent",
];

/** Amazon-friendly base search term per category. */
const CATEGORY_TERMS: Record<ProductCategory, string> = {
  bedding: "dorm comforter set twin xl",
  rug: "area rug",
  desk_lamp: "desk lamp",
  ambient_lighting: "string lights led",
  wall_decor: "wall art decor",
  storage: "storage bins organizer",
  throw: "throw blanket",
  curtains: "window curtains",
  desk_accessories: "desk organizer set",
  mirror: "wall mirror",
  laundry_hamper: "laundry hamper",
  power_strip: "power strip surge protector",
  trash_can: "trash can",
  towel_caddy: "shower caddy towels",
  accent: "decorative accent",
  plant: "faux plant",
  tapestry: "wall tapestry",
  desk_organizer: "desk organizer",
  clip_fan: "clip on fan",
};

/** Stopwords stripped when lifting descriptors out of a vibe. */
const VIBE_STOPWORDS = new Set([
  "a", "an", "the", "and", "or", "with", "of", "lots", "some", "very", "really",
  "kind", "sort", "like", "vibe", "vibes", "energy", "for", "my", "i", "want",
  "give", "me", "please", "room", "dorm", "aesthetic", "feel", "feeling", "to",
  "in", "on", "it", "that", "this", "is", "be", "look", "looks", "make",
]);

/** Lift up to `max` descriptive tokens (colors, materials, moods) from a vibe. */
export function vibeDescriptors(vibe: string, max = 4): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const w of vibe.toLowerCase().split(/[^a-z]+/)) {
    if (w.length < 3 || VIBE_STOPWORDS.has(w) || seen.has(w)) continue;
    seen.add(w);
    out.push(w);
    if (out.length >= max) break;
  }
  return out;
}

/** One search query per core category, blending the vibe's descriptors with the
 *  category term. Deterministic; the route may override with a Claude result. */
export function generateVibeQueries(vibe: string): Record<string, string> {
  const desc = vibeDescriptors(vibe).join(" ");
  const queries: Record<string, string> = {};
  for (const cat of CORE_VIBE_CATEGORIES) {
    queries[cat] = desc ? `${desc} ${CATEGORY_TERMS[cat]}` : CATEGORY_TERMS[cat];
  }
  return queries;
}
