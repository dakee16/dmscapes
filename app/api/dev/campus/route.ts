import fs from "node:fs/promises";
import path from "node:path";
import { boundedJson, sameOrigin } from "@/lib/request-body";

/**
 * Dev-only backend for the campus review page (app/dev/campus/[collegeId]).
 *   GET  ?collegeId=&place=   minutes and walking path from every hall to one place
 *   GET  ?worker              the MapLibre web worker (it can't find itself once bundled)
 *   POST { collegeId, dormId, pin?: [lng, lat], year?, yearSource? }
 *                             writes data/campus/overrides/<collegeId>.json; rebuild to re-route
 * 404 in production, like the page.
 */
const ID = /^[a-z0-9-]+$/;
const YEARS = new Set(["first", "upper", "any", null]);
const missing = () => new Response(null, { status: 404 });
// Paths stay statically scoped to data/campus so the production trace doesn't pull in the whole repo.
const campusFile = (name: string) => path.join(process.cwd(), "data", "campus", name);
const readJson = (file: string) => fs.readFile(file, "utf8").then(JSON.parse).catch(() => null);

type Minutes = { places: string[]; halls: Record<string, (number | null)[]> };
type Overrides = { halls?: Record<string, { pin?: [number, number]; year?: string | null; yearSource?: string }> } & Record<string, unknown>;

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") return missing();
  const params = new URL(request.url).searchParams;
  if (params.has("worker")) {
    const file = path.join(process.cwd(), "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs");
    return new Response(await fs.readFile(file), { headers: { "Content-Type": "text/javascript" } });
  }
  const collegeId = params.get("collegeId") ?? "";
  const place = params.get("place") ?? "";
  const minutes: Minutes | null = ID.test(collegeId) ? await readJson(campusFile(`${collegeId}.minutes.json`)) : null;
  const at = minutes?.places.indexOf(place) ?? -1;
  if (!minutes || at < 0) return missing();
  const out: Record<string, { minutes: number | null; path: string | null }> = {};
  for (const [dormId, row] of Object.entries(minutes.halls)) {
    const paths: Record<string, string> | null = await readJson(campusFile(`paths/${collegeId}/${dormId}.json`));
    out[dormId] = { minutes: row[at], path: paths?.[place] ?? null };
  }
  return Response.json(out);
}

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") return missing();
  if (!sameOrigin(request)) return Response.json({ error: "cross-origin" }, { status: 403 });
  const body = await boundedJson(request);
  const collegeId = typeof body?.collegeId === "string" && ID.test(body.collegeId) ? body.collegeId : null;
  // The campus file lists every hall in the school file.
  const campus = collegeId ? await readJson(campusFile(`${collegeId}.json`)) : null;
  const dormId = body?.dormId;
  if (!campus || !campus.halls.some((h: { dormId: string }) => h.dormId === dormId)) {
    return Response.json({ error: "unknown school or hall" }, { status: 400 });
  }
  const pin = body?.pin;
  const pinOk = pin === undefined || (Array.isArray(pin) && pin.length === 2 && pin.every((v) => typeof v === "number" && Number.isFinite(v)) && Math.abs(pin[0]) <= 180 && Math.abs(pin[1]) <= 90);
  const yearOk = body?.year === undefined || YEARS.has(body.year as string | null);
  const sourceOk = body?.yearSource === undefined || (typeof body.yearSource === "string" && /^https?:\/\/\S+$/.test(body.yearSource));
  if (!pinOk || !yearOk || !sourceOk) return Response.json({ error: "bad pin, year or yearSource" }, { status: 400 });

  const file = campusFile(`overrides/${collegeId}.json`);
  const overrides: Overrides = (await readJson(file)) ?? {};
  const hall = { ...overrides.halls?.[dormId as string] };
  if (pin !== undefined) hall.pin = [Number(pin[0].toFixed(6)), Number(pin[1].toFixed(6))];
  if (body?.year !== undefined) hall.year = body.year as string | null;
  if (body?.yearSource !== undefined) hall.yearSource = body.yearSource as string;
  overrides.halls = { ...overrides.halls, [dormId as string]: hall };
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(overrides, null, 2) + "\n");
  return Response.json({ hall });
}
