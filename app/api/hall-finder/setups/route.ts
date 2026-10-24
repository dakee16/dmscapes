import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { boundedJson, sameOrigin } from "@/lib/request-body";
import { rateLimit } from "@/lib/rate-limit";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { isPaid } from "@/lib/plan";
import { storablePlaces } from "@/lib/hall-finder-server";

export const runtime = "nodejs";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
const MAX_SETUPS = 50;
const COLUMNS = "id, college_id, name, places, filters, share_token, updated_at";

type Row = { id: string; college_id: string; name: string; places: unknown; filters: unknown; share_token: string | null; updated_at: string };
const shape = (r: Row) => ({ id: r.id, collegeId: r.college_id, name: r.name, places: r.places, filters: r.filters, shareToken: r.share_token, updatedAt: r.updated_at });
// Postgres "undefined_table": the migration hasn't run, so the client hides Save and Share.
const missingTable = (e: { code?: string } | null) => e?.code === "42P01" || e?.code === "PGRST205";

/** Saved Hall Finder setups (Plus and Pro). Server-only table access with the service role. */
async function member(request: Request) {
  const rl = rateLimit(request, "hall-finder-setups", 120, 10 * 60 * 1000);
  if (!rl.allowed) return { error: reply({ error: "Too many requests. Give it a minute." }, 429) };
  const db = getServiceClient();
  if (!db) return { error: reply({ error: "Saving is unavailable right now.", unavailable: true }, 503) };
  const userId = await getUserId(request);
  if (!userId) return { error: reply({ error: "Sign in to save setups." }, 401) };
  const { data: profile } = await db.from("profiles").select("plan").eq("id", userId).maybeSingle();
  if (!isPaid(profile)) return { error: reply({ error: "Saved setups come with Plus." }, 403) };
  return { db, userId };
}

const cleanName = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 80) : null);

export async function GET(request: Request) {
  const m = await member(request);
  if ("error" in m) return m.error;
  const collegeId = new URL(request.url).searchParams.get("collegeId");
  let q = m.db.from("hall_finder_setups").select(COLUMNS).eq("user_id", m.userId).order("updated_at", { ascending: false }).limit(MAX_SETUPS);
  if (collegeId) q = q.eq("college_id", collegeId);
  const { data, error } = await q;
  if (missingTable(error)) return reply({ error: "Saving isn't set up yet.", unavailable: true }, 503);
  if (error) return reply({ error: "Couldn't load your setups." }, 503);
  return reply({ setups: (data as Row[]).map(shape) });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Cross-origin requests aren't allowed." }, 403);
  const m = await member(request);
  if ("error" in m) return m.error;
  const body = await boundedJson(request);
  const setup = await storablePlaces(body);
  if (!setup) return reply({ error: "Those places couldn't be read." }, 400);
  const { count } = await m.db.from("hall_finder_setups").select("id", { count: "exact", head: true }).eq("user_id", m.userId);
  if ((count ?? 0) >= MAX_SETUPS) return reply({ error: `You can keep up to ${MAX_SETUPS} setups. Delete one to save another.` }, 409);
  const { data, error } = await m.db
    .from("hall_finder_setups")
    .insert({ user_id: m.userId, college_id: setup.collegeId, name: cleanName(body?.name) ?? "My classes", places: setup.places, filters: setup.filters })
    .select(COLUMNS)
    .single();
  if (missingTable(error)) return reply({ error: "Saving isn't set up yet.", unavailable: true }, 503);
  if (error || !data) return reply({ error: "Couldn't save that setup." }, 503);
  return reply({ setup: shape(data as Row) }, 201);
}

export async function PATCH(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Cross-origin requests aren't allowed." }, 403);
  const m = await member(request);
  if ("error" in m) return m.error;
  const body = await boundedJson(request);
  const id = typeof body?.id === "string" ? body.id : "";
  const { data: current } = await m.db.from("hall_finder_setups").select(COLUMNS).eq("id", id).eq("user_id", m.userId).maybeSingle();
  if (!current) return reply({ error: "That setup isn't yours or doesn't exist." }, 404);
  const update: Record<string, unknown> = {};
  if (body?.places !== undefined) {
    const setup = await storablePlaces({ ...body, collegeId: (current as Row).college_id });
    if (!setup) return reply({ error: "Those places couldn't be read." }, 400);
    update.places = setup.places;
    update.filters = setup.filters;
  }
  if (body?.name !== undefined) {
    const name = cleanName(body.name);
    if (!name) return reply({ error: "Give the setup a name." }, 400);
    update.name = name;
  }
  if (body?.share === true && !(current as Row).share_token) update.share_token = randomBytes(18).toString("base64url");
  if (body?.share === false) update.share_token = null;
  if (!Object.keys(update).length) return reply({ setup: shape(current as Row) });
  const { data, error } = await m.db.from("hall_finder_setups").update(update).eq("id", id).eq("user_id", m.userId).select(COLUMNS).single();
  if (error || !data) return reply({ error: "Couldn't update that setup." }, 503);
  return reply({ setup: shape(data as Row) });
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return reply({ error: "Cross-origin requests aren't allowed." }, 403);
  const m = await member(request);
  if ("error" in m) return m.error;
  const body = await boundedJson(request);
  const id = typeof body?.id === "string" ? body.id : "";
  const { error } = await m.db.from("hall_finder_setups").delete().eq("id", id).eq("user_id", m.userId);
  if (error) return reply({ error: "Couldn't delete that setup." }, 503);
  return reply({ deleted: id });
}
