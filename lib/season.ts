// The Halloween season (design-handoff/halloween/plan.md): a light site theme
// plus the limited Spooky Season vibe. Live from merge until the end of Oct 31,
// Eastern time; everything themed is scoped to <html data-season="halloween">.

export const SEASON = { id: "halloween", end: "2026-11-01T00:00:00-04:00" } as const;

const END_MS = Date.parse(SEASON.end);

/** Kill switch: NEXT_PUBLIC_SEASON=off turns the season off on the next deploy. */
export const SEASON_ENABLED = process.env.NEXT_PUBLIC_SEASON !== "off";

/** Inside the window. The end is an absolute instant, so any clock agrees on it. */
export function isSeason(now: number = Date.now()): boolean {
  return SEASON_ENABLED && now < END_MS;
}

/** sessionStorage key for the ?season=halloween (or ?season=off) preview flag. */
const PREVIEW_KEY = "dormscape-season";

/**
 * Runs in <head> before first paint: static pages are built once, so only the
 * browser can tell when the window has closed. ?season=halloween forces the
 * theme on and ?season=off forces it off, for the rest of the tab session.
 */
export const SEASON_SCRIPT = `(function(){var on=Date.now()<${END_MS};try{var s=sessionStorage,m=/[?&]season=(halloween|off)\\b/.exec(location.search);if(m)s.setItem("${PREVIEW_KEY}",m[1]);var f=s.getItem("${PREVIEW_KEY}");if(f)on=f==="${SEASON.id}"}catch(e){}if(on)document.documentElement.setAttribute("data-season","${SEASON.id}")})()`;
