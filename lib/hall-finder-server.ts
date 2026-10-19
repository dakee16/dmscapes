// SERVER-ONLY. Hall Finder scoring: the walk-minute matrix and walking paths
// (data/campus/<id>.minutes.json, data/campus/paths/<id>/) never reach the browser.
// The API routes call rank() and pathsFor(), then trim the answer to the viewer's tier.
import "server-only";
import fs from "node:fs/promises";
import path from "node:path";
import { getUserId } from "@/lib/supabase-auth";
import { getServiceClient } from "@/lib/supabase-server";
import { isPaid } from "@/lib/plan";
import {
  ALL_WEEK,
  MAX_PLACES,
  dayCount,
  hasHallFinder,
  type Campus,
  type DraftPlace,
  type Filters,
  type HallFacts,
} from "@/lib/hall-finder";

// Paths stay statically scoped so the production trace ships only data/campus and data/schools.
const campusFile = (name: string) => path.join(process.cwd(), "data", "campus", name);
const schoolFile = (name: string) => path.join(process.cwd(), "data", "schools", name);
const readJson = async <T>(file: string): Promise<T | null> => JSON.parse(await fs.readFile(file, "utf8").catch(() => "null")) as T | null;

interface Minutes {
  places: string[];
  halls: Record<string, (number | null)[]>;
  attached?: Record<string, string[]>;
}
interface SchoolDorm {
  dorm_id: string;
  housing_area?: string | null;
  air_conditioning?: boolean | null;
  rooms?: { room_type_official?: string; room_type?: string; occupants?: number | null; dimensions?: { length_ft?: number | null; width_ft?: number | null } }[];
}

export interface Loaded {
  campus: Campus;
  minutes: Minutes;
  placeIndex: Map<string, number>;
  facts: Record<string, HallFacts>;
}

/** Per-hall facts the finder shows: housing area, AC, room types with sizes. */
export function hallFacts(dorms: SchoolDorm[]): Record<string, HallFacts> {
  return Object.fromEntries(
    dorms.map((d) => [
      d.dorm_id,
      {
        area: d.housing_area ?? null,
        ac: typeof d.air_conditioning === "boolean" ? d.air_conditioning : null,
        rooms: (d.rooms ?? []).map((r) => ({
          label: r.room_type_official ?? r.room_type ?? "Room",
          occupants: typeof r.occupants === "number" ? r.occupants : null,
          lengthFt: r.dimensions?.length_ft ?? null,
          widthFt: r.dimensions?.width_ft ?? null,
        })),
      },
    ]),
  );
}

export async function readSchoolDorms(collegeId: string): Promise<SchoolDorm[]> {
  return (await readJson<{ dorms: SchoolDorm[] }>(schoolFile(`${collegeId}.json`)))?.dorms ?? [];
}

const loaded = new Map<string, Promise<Loaded | null>>();
export function loadCampus(collegeId: string): Promise<Loaded | null> {
  if (!hasHallFinder(collegeId)) return Promise.resolve(null);
  if (!loaded.has(collegeId)) {
    loaded.set(
      collegeId,
      (async () => {
        const [campus, minutes, dorms] = await Promise.all([
          readJson<Campus>(campusFile(`${collegeId}.json`)),
          readJson<Minutes>(campusFile(`${collegeId}.minutes.json`)),
          readSchoolDorms(collegeId),
        ]);
        if (!campus || !minutes) return null;
        return { campus, minutes, placeIndex: new Map(minutes.places.map((id, i) => [id, i])), facts: hallFacts(dorms) };
      })(),
    );
  }
  return loaded.get(collegeId)!;
}

export function readPaths(collegeId: string, dormId: string): Promise<Record<string, string> | null> {
  if (!/^[a-z0-9-]+$/.test(dormId)) return Promise.resolve(null);
  return readJson<Record<string, string>>(campusFile(path.join("paths", collegeId, `${dormId}.json`)));
}

// ---- Request parsing

export interface RankRequest {
  collegeId: string;
  places: DraftPlace[];
  filters: Filters;
}

/** Validates a { collegeId, places, filters } body against the campus; null when it's not usable. */
export async function parseRankRequest(body: Record<string, unknown> | null): Promise<{ req: RankRequest; data: Loaded } | null> {
  const collegeId = typeof body?.collegeId === "string" ? body.collegeId : "";
  const data = await loadCampus(collegeId);
  if (!data || !Array.isArray(body?.places) || body.places.length === 0 || body.places.length > MAX_PLACES) return null;
  const [w, s, e, n] = data.campus.bounds;
  const places: DraftPlace[] = [];
  for (const raw of body.places as Record<string, unknown>[]) {
    const days = Number(raw?.days);
    if (!Number.isInteger(days) || days < 1 || days > ALL_WEEK) return null;
    if (typeof raw.placeId === "string" && data.placeIndex.has(raw.placeId)) {
      places.push({ placeId: raw.placeId, days, source: "manual" });
      continue;
    }
    const pin = raw.pin;
    const ok = Array.isArray(pin) && pin.length === 2 && pin.every((v) => typeof v === "number" && Number.isFinite(v));
    // A pin has to be on or near the campus the minutes cover.
    if (!ok || pin[0] < w - 0.02 || pin[0] > e + 0.02 || pin[1] < s - 0.02 || pin[1] > n + 0.02) return null;
    places.push({ pin: [pin[0], pin[1]], days, source: "pin" });
  }
  const f = (body.filters ?? {}) as Record<string, unknown>;
  const filters: Filters = { firstYear: f.firstYear === true, ac: f.ac === true, singles: f.singles === true, doubles: f.doubles === true };
  return { req: { collegeId, places, filters }, data };
}

// ---- Scoring

const SPEED = 1.35; // m/s, scripts/campus/config walkingSpeed
const SNAP_M = 150;
const DETOUR = 1.3;

function haversine([lng1, lat1]: [number, number], [lng2, lat2]: [number, number]): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371008.8 * Math.asin(Math.sqrt(a));
}

/** A place in the minute matrix, plus walking minutes past it for a pin that isn't on one. */
interface Target {
  col: number;
  extra: number;
  approx: boolean;
}

/** A dropped pin: the nearest place within 150 m, else the nearest place plus the straight line ×1.3. */
function pinTarget(data: Loaded, pin: [number, number]): Target {
  let best = { col: 0, d: Infinity };
  for (const p of data.campus.places) {
    const col = data.placeIndex.get(p.id);
    if (col === undefined) continue;
    const d = haversine(pin, [p.lng, p.lat]);
    if (d < best.d) best = { col, d };
  }
  return best.d <= SNAP_M ? { col: best.col, extra: 0, approx: false } : { col: best.col, extra: (best.d * DETOUR) / SPEED / 60, approx: true };
}

export function targetsFor(data: Loaded, places: DraftPlace[]): Target[] {
  return places.map((p) => (p.placeId ? { col: data.placeIndex.get(p.placeId)!, extra: 0, approx: false } : pinTarget(data, p.pin!)));
}

export interface RankedHall {
  dormId: string;
  /** Minutes walking a week: Σ days × one-way × 2. */
  weekly: number;
  /** The longest single one-way trip. */
  farthest: number;
  perPlace: { minutes: number; approx: boolean }[];
}

/** Whether the campus has any year tags, so the first-year filter means something. */
export const hasYearData = (data: Loaded) => data.campus.halls.some((h) => h.year !== null);

function passes(data: Loaded, dormId: string, f: Filters): boolean {
  const hall = data.campus.halls.find((h) => h.dormId === dormId);
  const facts = data.facts[dormId];
  if (f.firstYear && hasYearData(data) && hall?.year !== "first" && hall?.year !== "any") return false;
  if (f.ac && facts?.ac !== true) return false;
  if (f.singles && !facts?.rooms.some((r) => r.occupants === 1)) return false;
  if (f.doubles && !facts?.rooms.some((r) => r.occupants === 2)) return false;
  return true;
}

const round1 = (v: number) => Math.round(v * 10) / 10;

export function rank(data: Loaded, req: RankRequest): RankedHall[] {
  const targets = targetsFor(data, req.places);
  const out: RankedHall[] = [];
  for (const [dormId, row] of Object.entries(data.minutes.halls)) {
    if (!passes(data, dormId, req.filters)) continue;
    const perPlace = targets.map((t) => ({ minutes: (row[t.col] ?? NaN) + t.extra, approx: t.approx }));
    if (perPlace.some((p) => !Number.isFinite(p.minutes))) continue;
    const weekly = req.places.reduce((sum, p, i) => sum + dayCount(p.days) * perPlace[i].minutes * 2, 0);
    out.push({
      dormId,
      weekly: round1(weekly),
      farthest: round1(Math.max(...perPlace.map((p) => p.minutes))),
      perPlace: perPlace.map((p) => ({ minutes: round1(p.minutes), approx: p.approx })),
    });
  }
  return out.sort((a, b) => a.weekly - b.weekly || a.farthest - b.farthest || a.dormId.localeCompare(b.dormId));
}

/** Encoded walking paths from one hall to each requested place (a pin gets its nearest place's). */
export async function pathsFor(data: Loaded, dormId: string, places: DraftPlace[]): Promise<(string | null)[] | null> {
  const file = await readPaths(data.campus.collegeId, dormId);
  if (!file) return null;
  return targetsFor(data, places).map((t) => file[data.minutes.places[t.col]] ?? null);
}

// ---- Who's asking

export type Tier = "anon" | "free" | "paid";

/** Signed out, a free account, or Plus/Pro. Dev builds honour x-dormscape-dev-plan for local QA. */
export async function viewerTier(request: Request): Promise<Tier> {
  if (process.env.NODE_ENV !== "production") {
    const dev = request.headers.get("x-dormscape-dev-plan");
    if (dev === "free") return "free";
    if (dev === "plus" || dev === "pro") return "paid";
  }
  const userId = await getUserId(request);
  const db = getServiceClient();
  if (!userId || !db) return "anon";
  const { data } = await db.from("profiles").select("plan").eq("id", userId).maybeSingle();
  return isPaid(data) ? "paid" : "free";
}
