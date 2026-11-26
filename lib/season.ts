// Seasons: a light site theme plus a limited seasonal vibe, each live inside
// its own window. Everything themed is scoped to <html data-season="…">.
// Halloween (design-handoff/halloween/plan.md) has ended; its "spooky" vibe and
// products stay, so saved Spooky designs keep opening. The holiday season runs
// Dec 1 to the end of Dec 31, Eastern, with the free Cozy Holiday vibe.

/** Each window is a pair of absolute instants, so any clock agrees on it. `style` is the season's free vibe. */
export const SEASONS = [
  { id: "halloween", style: "spooky", start: "2026-10-18T00:00:00-04:00", end: "2026-11-01T00:00:00-04:00" },
  { id: "holiday", style: "holiday", start: "2026-12-01T00:00:00-05:00", end: "2027-01-01T00:00:00-05:00" },
] as const;

export type Season = (typeof SEASONS)[number];

/** Kill switch: NEXT_PUBLIC_SEASON=off turns every season off on the next deploy. */
export const SEASON_ENABLED = process.env.NEXT_PUBLIC_SEASON !== "off";

const WINDOWS = SEASONS.map((s) => [s.id, Date.parse(s.start), Date.parse(s.end)] as const);

/** The season live at `now` by this clock (the server's, for anything that costs credits). */
export function seasonAt(now: number = Date.now()): Season | undefined {
  if (!SEASON_ENABLED) return undefined;
  const i = WINDOWS.findIndex(([, start, end]) => now >= start && now < end);
  return i < 0 ? undefined : SEASONS[i];
}

/** Inside any season's window. */
export const isSeason = (now: number = Date.now()): boolean => seasonAt(now) !== undefined;

/** A seasonal vibe is free while its own season is live (/api/plan/consume decides with this). */
export function freeInSeason(style: unknown, now: number = Date.now()): boolean {
  const s = seasonAt(now);
  return s !== undefined && s.style === style;
}

/** The season a seasonal vibe belongs to. */
export const seasonOf = (style: string | null | undefined): Season | undefined => SEASONS.find((s) => s.style === style);

/** "Dec 31": a season's last day, Eastern. */
export const lastDay = (s: Season): string =>
  new Date(Date.parse(s.end) - 1).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" });

/** In the browser: the season this visit has on (the head script's call, preview included). */
export function currentSeason(): Season | undefined {
  if (typeof document === "undefined") return undefined;
  const id = document.documentElement.dataset.season;
  return SEASONS.find((s) => s.id === id);
}

/** In the browser: whether any season is on, or with `style`, whether that vibe's own season is. */
export function seasonOn(style?: string | null): boolean {
  const s = currentSeason();
  return s !== undefined && (style === undefined || s.style === style);
}

/** sessionStorage key for the ?season=<id> (or ?season=off) preview flag. */
const PREVIEW_KEY = "dormscape-season";

/**
 * Runs in <head> before first paint: static pages are built once, so only the
 * browser can tell which window it's in. ?season=holiday (or any season id)
 * forces that season on and ?season=off forces every season off, for the rest
 * of the tab session.
 */
export const SEASON_SCRIPT = `(function(){var w=${JSON.stringify(WINDOWS)},n=Date.now(),on=null;for(var i=0;i<w.length;i++)if(n>=w[i][1]&&n<w[i][2])on=w[i][0];try{var s=sessionStorage,m=/[?&]season=(${SEASONS.map((s) => s.id).join("|")}|off)\\b/.exec(location.search);if(m)s.setItem("${PREVIEW_KEY}",m[1]);var f=s.getItem("${PREVIEW_KEY}");if(f)on=f==="off"?null:f}catch(e){}if(on)document.documentElement.setAttribute("data-season",on)})()`;
