// Hall Finder (design-handoff/hall-finder/plan.md): rank a school's halls by the walk to
// a student's classes. Ships dark: live only when NEXT_PUBLIC_HALL_FINDER=on. Until then
// the finder pages still render for pilot schools but are noindex, out of the sitemap,
// and nothing links to them; ?hallfinder=preview shows the entry points for the session.
// Client-safe: no minutes or paths here (those stay server-side, lib/hall-finder-server).
import PILOTS from "@/data/campus/index.json";
import { isSeason } from "@/lib/season";

export const PILOT_SCHOOLS: readonly string[] = PILOTS;

export function hallFinderLive(): boolean {
  return process.env.NEXT_PUBLIC_HALL_FINDER === "on";
}

/** A pilot school: one with a data/campus/<id>.json (scripts/campus/build.mjs lists them). */
export function hasHallFinder(collegeId: string | null | undefined): boolean {
  return Boolean(collegeId) && PILOT_SCHOOLS.includes(collegeId!);
}

/** localStorage "send me back to the finder after I sign in", as "<ms>|<path>": email verification lands elsewhere. */
export const RESUME_KEY = "dormscape-hall-finder-resume";
const RESUME_TTL = 24 * 60 * 60 * 1000;
export function setResume(path: string): void {
  try { localStorage.setItem(RESUME_KEY, `${Date.now()}|${path}`); } catch {}
}
/** The finder path to resume after a sign-in landing, once (it's cleared either way). */
export function takeResume(): string | null {
  try {
    const raw = localStorage.getItem(RESUME_KEY);
    localStorage.removeItem(RESUME_KEY);
    const cut = (raw ?? "").indexOf("|");
    const at = (raw ?? "").slice(0, cut);
    const path = cut > 0 ? (raw ?? "").slice(cut + 1) : "";
    const ok = path?.startsWith("/") && Date.now() - Number(at) < RESUME_TTL;
    if (ok) sessionStorage.setItem(RESUMED_KEY, "1");
    return ok ? path : null;
  } catch {
    return null;
  }
}

/** sessionStorage: this tab signed in from the finder's gate (set by takeResume). */
const RESUMED_KEY = "dormscape-hall-finder-resumed";
/** On a finder page, or this tab came back to one after signing in: the signup welcome stays away. */
export function cameFromHallFinder(): boolean {
  try {
    return sessionStorage.getItem(RESUMED_KEY) === "1" || /\/hall-finder(\/|$)/.test(window.location.pathname);
  } catch {
    return false;
  }
}

/** sessionStorage key for the ?hallfinder=preview flag (?hallfinder=off clears it). */
export const PREVIEW_KEY = "dormscape-hall-finder";

/** In the browser: live, or this tab saw ?hallfinder=preview. Records the flag as a side effect. */
export function hallFinderOn(): boolean {
  if (hallFinderLive()) return true;
  if (typeof window === "undefined") return false;
  try {
    const m = /[?&]hallfinder=(preview|off)\b/.exec(window.location.search);
    if (m?.[1] === "preview") window.sessionStorage.setItem(PREVIEW_KEY, "preview");
    if (m?.[1] === "off") window.sessionStorage.removeItem(PREVIEW_KEY);
    return window.sessionStorage.getItem(PREVIEW_KEY) === "preview";
  } catch {
    return false;
  }
}

/** The homepage hero chip: Jan 1 – Mar 31 Eastern, only when live (or `on`: the browser's
 *  hallFinderOn(), preview included), never during the Halloween season. */
export function heroChipOn(now: number = Date.now(), on: boolean = hallFinderLive()): boolean {
  if (!on || isSeason(now)) return false;
  const month = Number(new Intl.DateTimeFormat("en-US", { timeZone: "America/New_York", month: "numeric" }).format(now));
  return month >= 1 && month <= 3;
}

// ---- Campus data as the finder page receives it (data/campus/<id>.json, no minutes)

export type Year = "first" | "upper" | "any" | null;
export type PlaceKind = "academic" | "dining" | "gym" | "library";

export interface CampusHall {
  dormId: string;
  name: string;
  lng: number | null;
  lat: number | null;
  pin: "name" | "address" | "manual" | null;
  osm: string | null;
  year: Year;
  yearSource: string | string[] | null;
  /** Nearest dining hall, library and gym by walking minutes (public; the hall page shows them). */
  near?: Partial<Record<"dining" | "library" | "gym", { placeId: string; minutes: number }>>;
}

export interface CampusPlace {
  id: string;
  name: string;
  short: string;
  kind: PlaceKind;
  codes: string[];
  aliases: string[];
  lng: number;
  lat: number;
  osm: string;
}

export interface Campus {
  collegeId: string;
  generatedAt: string;
  sources: { name: string; url: string; use?: string; license?: string }[];
  bounds: [number, number, number, number];
  halls: CampusHall[];
  places: CampusPlace[];
}

/** What the finder shows about each hall, from data/schools (server page reads it at build). */
export interface HallFacts {
  area: string | null;
  ac: boolean | null;
  rooms: { label: string; occupants: number | null; lengthFt: number | null; widthFt: number | null }[];
}

// ---- The draft: places with days, plus filters

export const DAYS = ["M", "T", "W", "Th", "F"] as const;
/** Days as a bitmask, M = 1 … F = 16. */
export type DayMask = number;
export const ALL_WEEK: DayMask = 31;
export const dayCount = (mask: DayMask): number => DAYS.reduce((n, _, i) => n + ((mask >> i) & 1), 0);

export type PlaceSource = "manual" | "ics" | "quick" | "pin" | "image";

export interface DraftPlace {
  /** A campus place id, or absent for a dropped pin. */
  placeId?: string;
  pin?: [number, number];
  days: DayMask;
  /** The course or text this came from ("ECON 102"). */
  label?: string;
  source: PlaceSource;
}

export interface Filters {
  firstYear: boolean;
  ac: boolean;
  singles: boolean;
  doubles: boolean;
}

export const NO_FILTERS: Filters = { firstYear: false, ac: false, singles: false, doubles: false };
const FILTER_KEYS = ["firstYear", "ac", "singles", "doubles"] as const;

export interface Draft {
  places: DraftPlace[];
  filters: Filters;
  /** The last schedule file read, for the "schedule.ics · 4 classes added" line. */
  ics?: { name: string; count: number };
}

export const MAX_PLACES = 20;
// Append only: ?s= links store each source's index here.
const SOURCES: PlaceSource[] = ["manual", "ics", "quick", "pin", "image"];

// Compact URL form for ?s=: base64url JSON of { p: [[placeId | [lng, lat], days, source, label?]], f, i }.
type Packed = { p: [string | [number, number], number, number, string?][]; f: number; i?: [string, number] };

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(s: string): string {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/"));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeDraft(d: Draft): string {
  const packed: Packed = {
    p: d.places.map((p) => {
      const where: string | [number, number] = p.placeId ?? [Number(p.pin![0].toFixed(5)), Number(p.pin![1].toFixed(5))];
      const row: Packed["p"][number] = [where, p.days, SOURCES.indexOf(p.source)];
      if (p.label) row.push(p.label.slice(0, 24));
      return row;
    }),
    f: FILTER_KEYS.reduce((bits, k, i) => bits | (d.filters[k] ? 1 << i : 0), 0),
  };
  if (d.ics) packed.i = [d.ics.name.slice(0, 40), d.ics.count];
  return toBase64Url(JSON.stringify(packed));
}

/** Parses ?s=; anything malformed comes back null rather than half a draft. */
export function decodeDraft(s: string | null | undefined): Draft | null {
  if (!s || s.length > 4000) return null;
  try {
    const packed = JSON.parse(fromBase64Url(s)) as Packed;
    if (!Array.isArray(packed?.p)) return null;
    const places: DraftPlace[] = [];
    for (const [where, days, src, label] of packed.p.slice(0, MAX_PLACES)) {
      const mask = Number(days) & ALL_WEEK;
      const source = SOURCES[Number(src)] ?? "manual";
      const lab = typeof label === "string" ? label.slice(0, 24) : undefined;
      if (typeof where === "string" && /^[a-z0-9-]+$/.test(where)) places.push({ placeId: where, days: mask, source, label: lab });
      else if (Array.isArray(where) && where.length === 2 && where.every((v) => Number.isFinite(v))) places.push({ pin: [where[0], where[1]], days: mask, source, label: lab });
    }
    const f = Number(packed.f) || 0;
    const filters = Object.fromEntries(FILTER_KEYS.map((k, i) => [k, Boolean(f & (1 << i))])) as unknown as Filters;
    const ics = Array.isArray(packed.i) && typeof packed.i[0] === "string" ? { name: packed.i[0], count: Number(packed.i[1]) || 0 } : undefined;
    return { places, filters, ics };
  } catch {
    return null;
  }
}

/** "3 h 34 m" / "48 min". */
export function formatMinutes(min: number): string {
  const m = Math.round(min);
  if (m < 60) return `${m} min`;
  return `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")} m`;
}

/** Google encoded polyline (precision 5) -> [lng, lat] points, for the path API's answers. */
export function decodePolyline(str: string): [number, number][] {
  const pts: [number, number][] = [];
  let i = 0, lat = 0, lng = 0;
  const next = () => {
    let shift = 0, result = 0, b: number;
    do {
      b = str.charCodeAt(i++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };
  while (i < str.length) {
    lat += next();
    lng += next();
    pts.push([lng / 1e5, lat / 1e5]);
  }
  return pts;
}

/** One hall's score as the rank API returns it (lib/hall-finder-server rank()). */
export interface RankedHall {
  dormId: string;
  /** Minutes walking a week: Σ days × one-way × 2. */
  weekly: number;
  /** The longest single one-way trip. */
  farthest: number;
  perPlace: { minutes: number; approx: boolean }[];
}

/** POST /api/hall-finder/rank, by tier: the count, the #1 hall plus weekly gaps, or everything. */
export type RankResult =
  | { tier: "anon"; count: number }
  | { tier: "free"; count: number; top: RankedHall | null; others: number[] }
  | { tier: "paid"; count: number; ranked: RankedHall[] };
