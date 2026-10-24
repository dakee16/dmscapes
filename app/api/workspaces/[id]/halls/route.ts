import type { DraftPlace, Filters } from "@/lib/hall-finder";
import { hasHallFinder } from "@/lib/hall-finder";
import { loadCampus, pathsFor, rank, storablePlaces, type Loaded } from "@/lib/hall-finder-server";
import { combineWeeks, type RoomHalls, type RoomPlace } from "@/lib/roommate-halls";
import { workspaceAccess, workspaceBody, workspaceIdentity, workspaceJson, workspaceUnavailable, uuid } from "@/lib/workspace-server";

// Hall Finder roommate mode: each member's own places, and the halls ranked for everyone.
// Any member can set their own places (commenters too); a Pro host unlocks it for the room.
// Roommates see each other's buildings and days only: labels and pin spots go to their owner.
export const runtime = "nodejs";
type Context = { params: Promise<{ id: string }> };

// Postgres "undefined_table": docs/migrations/20261024_workspace_hall_places.sql hasn't run.
const missingTable = (e: { code?: string } | null) => e?.code === "42P01" || e?.code === "PGRST205";
const notYet = () => workspaceJson({ error: "Comparing halls isn't set up for rooms yet.", unavailable: true }, 503);

async function room(request: Request, context: Context, write = false) {
  const auth = await workspaceIdentity(request, write);
  if (auth.response) return { response: auth.response };
  const { id } = await context.params;
  if (!uuid(id)) return { response: workspaceJson({ error: "Room not found." }, 404) };
  const access = await workspaceAccess(auth.db, id, auth.userId);
  if (access.response) return { response: access.response };
  const collegeId: string | null = access.workspace.snapshot?.college_id ?? null;
  const data = hasHallFinder(collegeId) ? await loadCampus(collegeId!) : null;
  if (!data) return { response: workspaceJson({ error: "Hall Finder doesn't cover this room's school yet." }, 404) };
  if (!access.ownerPro) return { response: workspaceJson({ error: "Comparing halls together comes with the host's Pro plan.", upgrade: true }, 403) };
  return { db: auth.db, userId: auth.userId, id, data };
}

/** Stored places still on the campus map (a rebuild can drop a building). */
const usable = (data: Loaded, places: RoomPlace[]): DraftPlace[] =>
  places
    .filter((p) => p.pin || (p.placeId && data.placeIndex.has(p.placeId)))
    .map((p) => ({ ...p, source: p.pin ? "pin" : p.label ? "ics" : "manual" }));

const own = (p: DraftPlace): RoomPlace => ({ ...(p.placeId ? { placeId: p.placeId } : { pin: p.pin }), days: p.days, ...(p.label ? { label: p.label } : {}) });
/** What a roommate sees of someone else's place. */
const shared = (p: DraftPlace): RoomPlace => (p.placeId ? { placeId: p.placeId, days: p.days } : { days: p.days });

const FILTERS = ["firstYear", "ac", "singles", "doubles"] as const;

/** GET ?filters=ac,singles&hall=<dormId>&campus=1 -> RoomHalls */
export async function GET(request: Request, context: Context) {
  const r = await room(request, context);
  if ("response" in r) return r.response;
  const url = new URL(request.url);
  const on = new Set((url.searchParams.get("filters") ?? "").split(","));
  const filters = Object.fromEntries(FILTERS.map((k) => [k, on.has(k)])) as unknown as Filters;
  const [members, rows] = await Promise.all([
    r.db.from("workspace_members").select("user_id").eq("workspace_id", r.id).order("joined_at"),
    r.db.from("workspace_hall_places").select("user_id, places").eq("workspace_id", r.id),
  ]);
  if (missingTable(rows.error)) return notYet();
  if (members.error || rows.error) return workspaceUnavailable();
  const ids: string[] = (members.data ?? []).map((m) => m.user_id);
  const { data: profiles } = await r.db.from("profiles").select("id,username,full_name").in("id", ids);
  const name = (uid: string) => {
    const p = profiles?.find((x) => x.id === uid);
    return p?.username ?? p?.full_name?.split(" ")[0] ?? "Roommate";
  };
  const placesOf = new Map<string, DraftPlace[]>(ids.map((uid) => [uid, usable(r.data, rows.data?.find((row) => row.user_id === uid)?.places ?? [])]));
  const collegeId = r.data.campus.collegeId;
  const ranked = new Map(ids.map((uid) => {
    const places = placesOf.get(uid)!;
    return [uid, places.length ? rank(r.data, { collegeId, places, filters }) : []];
  }));
  const weeks = Object.fromEntries(ids.map((uid) => [uid, new Map(ranked.get(uid)!.map((h) => [h.dormId, h.weekly]))]));

  const hall = url.searchParams.get("hall");
  let routes: RoomHalls["routes"] = null;
  if (hall && r.data.minutes.halls[hall]) {
    routes = Object.fromEntries(
      await Promise.all(
        ids.map(async (uid) => {
          const places = placesOf.get(uid)!;
          const paths = places.length ? ((await pathsFor(r.data, hall, places)) ?? []) : [];
          const minutes = ranked.get(uid)!.find((h) => h.dormId === hall)?.perPlace ?? [];
          // A roommate's pin route would show roughly where it was dropped.
          return [uid, paths.map((p, i) => ({ line: uid === r.userId || !places[i].pin ? p : null, minutes: minutes[i]?.minutes ?? 0 }))];
        }),
      ),
    );
  }

  const body: RoomHalls = {
    me: r.userId,
    people: ids.map((uid) => ({ userId: uid, name: name(uid), places: placesOf.get(uid)!.map(uid === r.userId ? own : shared) })),
    halls: combineWeeks(weeks),
    routes,
    ...(url.searchParams.get("campus") === "1" ? { start: { campus: r.data.campus, facts: r.data.facts, imagesOn: Boolean(process.env.ANTHROPIC_API_KEY) } } : {}),
  };
  return workspaceJson(body);
}

/** PUT { places } replaces your own places in this room ([] clears them). */
export async function PUT(request: Request, context: Context) {
  const r = await room(request, context, true);
  if ("response" in r) return r.response;
  const body = await workspaceBody(request);
  if (!body || !Array.isArray(body.places)) return workspaceJson({ error: "Invalid request." }, 400);
  const places = body.places.length ? (await storablePlaces({ collegeId: r.data.campus.collegeId, places: body.places }))?.places : [];
  if (!places) return workspaceJson({ error: "Those places couldn't be read." }, 400);
  const { error } = await r.db.from("workspace_hall_places").upsert({ workspace_id: r.id, user_id: r.userId, places }, { onConflict: "workspace_id,user_id" });
  if (missingTable(error)) return notYet();
  if (error) return workspaceUnavailable();
  return workspaceJson({ places });
}
