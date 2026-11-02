// SERVER ONLY. The hall gallery: layouts students chose to show, anonymously, on
// their hall's page (docs/migrations/20261102_growth_loops.sql). Only the room's
// shape, size, layout, vibe, budget and month leave the database: never the design's
// name, its owner, its products or its comments, and never its id (which opens it).
import { getServiceClient } from "./supabase-server";
import type { FurnitureItem, RoomOutline, StyleId } from "./types";

export type GalleryRoom = {
  roomType: string;
  lengthFt: number;
  widthFt: number;
  furniture: FurnitureItem[];
  outline: RoomOutline | null;
  style: StyleId;
  budget: number;
  sharedAt: string;
};

export const GALLERY_SIZE = 6;

export async function hallGallery(collegeId: string, dormId: string): Promise<GalleryRoom[]> {
  const db = getServiceClient();
  if (!db) return [];
  const { data, error } = await db
    .from("saved_rooms")
    .select("room_dimensions, furniture_positions, style, budget, gallery_at")
    .eq("college_id", collegeId)
    .eq("dorm_id", dormId)
    .not("gallery_at", "is", null)
    .is("gallery_hidden_at", null)
    .order("gallery_at", { ascending: false })
    .limit(GALLERY_SIZE);
  if (error) return []; // before the migration, or the database is unreachable: no section
  return (data ?? []).flatMap((r) => {
    const d = r.room_dimensions;
    if (!(d?.length_ft > 0 && d?.width_ft > 0) || !Array.isArray(r.furniture_positions)) return [];
    return [{
      roomType: d.room_type ?? "",
      lengthFt: d.length_ft,
      widthFt: d.width_ft,
      furniture: r.furniture_positions,
      outline: d.outline ?? null,
      style: r.style,
      budget: Number(r.budget),
      sharedAt: r.gallery_at,
    }];
  });
}
