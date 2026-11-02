// SERVER ONLY. Profile photos in the public "avatars" bucket
// (docs/migrations/20261103_creators_avatars.sql). The browser sends a 256 px square;
// the server takes only real JPEG, PNG or WebP files under AVATAR_MAX_BYTES, judged by
// their first bytes, never by the file name or the type the browser claims.
import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 256 * 1024;
export type AvatarKind = "webp" | "jpeg" | "png";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function imageKind(b: Buffer): AvatarKind | null {
  if (b.length > 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "webp";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(PNG)) return "png";
  return null;
}

/** The storage path inside the bucket, only if it's in this user's own folder. */
export function ownAvatarPath(url: string | null | undefined, userId: string): string | null {
  const marker = `/storage/v1/object/public/${AVATAR_BUCKET}/`;
  const at = url?.indexOf(marker) ?? -1;
  if (!url || at < 0) return null;
  const path = decodeURIComponent(url.slice(at + marker.length).split("?")[0]);
  return path.startsWith(`${userId}/`) && !path.includes("..") ? path : null;
}

/** Account deletion: every photo this user ever uploaded. */
export async function removeUserAvatars(db: SupabaseClient, userId: string): Promise<void> {
  const { data } = await db.storage.from(AVATAR_BUCKET).list(userId, { limit: 100 });
  if (data?.length) await db.storage.from(AVATAR_BUCKET).remove(data.map((f) => `${userId}/${f.name}`));
}
