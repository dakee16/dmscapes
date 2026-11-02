// SERVER ONLY. The hall gallery: layouts students chose to show on their hall's page
// and on /gallery (docs/migrations/20261102_growth_loops.sql). Only the room's shape,
// size, layout, vibe, budget and month leave the database: never the design's name,
// its products, its comments or its id (which opens it). The owner stays anonymous
// unless they're an approved creator, who is shown by @username and photo.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "./supabase-server";
import { getDorm } from "./schools";
import type { FurnitureItem, RoomOutline, StyleId } from "./types";

export type GalleryRoom = {
  collegeId: string;
  dormId: string;
  roomType: string;
  lengthFt: number;
  widthFt: number;
  furniture: FurnitureItem[];
  outline: RoomOutline | null;
  style: StyleId;
  budget: number;
  sharedAt: string;
  /** Creators only. */
  byline: { username: string; avatar: string | null } | null;
};

export const GALLERY_SIZE = 6;

/** The budget a card shows: rounded to $50 so a layout can't be matched to one cart. */
export const galleryBudget = (budget: number) => Math.max(50, Math.round(budget / 50) * 50);
/** "Nov 2026": the only date a shared layout shows. */
export const sharedMonth = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
const COLUMNS = "user_id, college_id, dorm_id, room_dimensions, furniture_positions, style, budget, gallery_at";

type Row = {
  user_id: string | null;
  college_id: string | null;
  dorm_id: string | null;
  room_dimensions: { length_ft?: number; width_ft?: number; room_type?: string; outline?: RoomOutline | null } | null;
  furniture_positions: FurnitureItem[] | null;
  style: StyleId;
  budget: number | string;
  gallery_at: string;
};

/** Only what the plan drawing needs: shape, place and colour. Labels, owners, assignments,
 *  products, costs and the pieces' own ids never leave the server (an RSC payload would carry
 *  anything passed through a client component). */
export function layoutOnly(furniture: FurnitureItem[]): FurnitureItem[] {
  return furniture.map((f, i) => ({
    id: String(i),
    type: f.type,
    label: "",
    owner: "",
    x_ft: Number(f.x_ft),
    y_ft: Number(f.y_ft),
    width_ft: Number(f.width_ft),
    length_ft: Number(f.length_ft),
    rotation_deg: Number(f.rotation_deg) || 0,
    movable: Boolean(f.movable),
    built_in: Boolean(f.built_in),
    color_category: f.color_category,
  }));
}

/** Fair shares: one layout per person per hall (their newest), and only real halls, so nobody
 *  can flood a hall's six spots or file layouts under a hall id we don't have. */
export function fairRows<T extends { user_id: string | null; college_id: string | null; dorm_id: string | null }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((r) => {
    if (!r.college_id || !r.dorm_id || !getDorm(r.college_id, r.dorm_id)) return false;
    const key = `${r.user_id ?? "?"}/${r.college_id}/${r.dorm_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function toRooms(db: SupabaseClient, all: Row[], limit: number): Promise<GalleryRoom[]> {
  const rows = fairRows(all).slice(0, limit);
  const owners = [...new Set(rows.map((r) => r.user_id).filter((id): id is string => Boolean(id)))];
  // Before 20261103_creators_avatars.sql, creator_at doesn't exist: the query fails and nobody gets a byline.
  const { data: creators } = owners.length
    ? await db.from("profiles").select("id, username, avatar_url").in("id", owners).not("creator_at", "is", null)
    : { data: [] };
  const byOwner = new Map(
    ((creators ?? []) as { id: string; username: string | null; avatar_url: string | null }[])
      .filter((c) => c.username)
      .map((c) => [c.id, { username: c.username!, avatar: c.avatar_url ?? null }])
  );
  return rows.flatMap((r) => {
    const d = r.room_dimensions;
    const hall = r.college_id && r.dorm_id ? getDorm(r.college_id, r.dorm_id) : undefined;
    if (!hall || !d || !(Number(d.length_ft) > 0 && Number(d.width_ft) > 0) || !Array.isArray(r.furniture_positions)) return [];
    // room_type is free text on save: only print it when it's one of this hall's own room types.
    const roomType = hall.dorm.rooms.some((x) => x.type === d.room_type) ? (d.room_type as string) : "";
    return [{
      collegeId: r.college_id!,
      dormId: r.dorm_id!,
      roomType,
      lengthFt: Number(d.length_ft),
      widthFt: Number(d.width_ft),
      furniture: layoutOnly(r.furniture_positions),
      outline: d.outline ?? null,
      style: r.style,
      budget: Number(r.budget),
      sharedAt: r.gallery_at,
      byline: (r.user_id && byOwner.get(r.user_id)) || null,
    }];
  });
}

/** The newest layouts shared for one hall. */
export async function hallGallery(collegeId: string, dormId: string): Promise<GalleryRoom[]> {
  const db = getServiceClient();
  if (!db) return [];
  const { data, error } = await db
    .from("saved_rooms")
    .select(COLUMNS)
    .eq("college_id", collegeId)
    .eq("dorm_id", dormId)
    .not("gallery_at", "is", null)
    .is("gallery_hidden_at", null)
    .order("gallery_at", { ascending: false })
    .limit(GALLERY_SIZE * 5);
  if (error) return []; // before the migration, or the database is unreachable: no section
  return toRooms(db, (data ?? []) as Row[], GALLERY_SIZE);
}

/** The newest layouts shared across every hall (/gallery). */
export async function recentGallery(limit = 24): Promise<GalleryRoom[]> {
  const db = getServiceClient();
  if (!db) return [];
  const { data, error } = await db
    .from("saved_rooms")
    .select(COLUMNS)
    .not("gallery_at", "is", null)
    .is("gallery_hidden_at", null)
    .not("dorm_id", "is", null)
    .order("gallery_at", { ascending: false })
    .limit(limit * 4);
  if (error) return [];
  return toRooms(db, (data ?? []) as Row[], limit);
}
