// SERVER ONLY. The hall gallery: layouts students chose to show on their hall's page
// and on /gallery (docs/migrations/20261102_growth_loops.sql). Only the room's shape,
// size, layout, vibe, budget and month leave the database: never the design's name,
// its products, its comments or its id (which opens it). The owner stays anonymous
// unless they're an approved creator, who is shown by @username and photo.
import type { SupabaseClient } from "@supabase/supabase-js";
import { getServiceClient } from "./supabase-server";
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

async function toRooms(db: SupabaseClient, rows: Row[]): Promise<GalleryRoom[]> {
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
    if (!r.college_id || !r.dorm_id || !d || !(Number(d.length_ft) > 0 && Number(d.width_ft) > 0) || !Array.isArray(r.furniture_positions)) return [];
    return [{
      collegeId: r.college_id,
      dormId: r.dorm_id,
      roomType: d.room_type ?? "",
      lengthFt: Number(d.length_ft),
      widthFt: Number(d.width_ft),
      furniture: r.furniture_positions,
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
    .limit(GALLERY_SIZE);
  if (error) return []; // before the migration, or the database is unreachable: no section
  return toRooms(db, (data ?? []) as Row[]);
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
    .limit(limit);
  if (error) return [];
  return toRooms(db, (data ?? []) as Row[]);
}
