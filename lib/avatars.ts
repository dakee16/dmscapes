// SERVER ONLY. Profile photos in the public "avatars" bucket
// (docs/migrations/20261103_creators_avatars.sql). The browser sends a 256 px square;
// the server takes only real JPEG, PNG or WebP files under AVATAR_MAX_BYTES, judged by
// their first bytes, never by the file name or the type the browser claims.
import type { SupabaseClient } from "@supabase/supabase-js";

export const AVATAR_BUCKET = "avatars";
export const AVATAR_MAX_BYTES = 256 * 1024;
/** The browser sends 256 px; anything much bigger was made by hand. A small file can still
 *  claim huge dimensions (a decompression bomb that freezes whoever views it), so cap them. */
export const AVATAR_MAX_SIDE = 512;
export type AvatarKind = "webp" | "jpeg" | "png";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function imageKind(b: Buffer): AvatarKind | null {
  if (b.length > 12 && b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP") return "webp";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpeg";
  if (b.length > 8 && b.subarray(0, 8).equals(PNG)) return "png";
  return null;
}

/** Width and height from the file's own header (PNG IHDR, a WebP VP8/VP8L/VP8X chunk, a
 *  JPEG start-of-frame), or null when it can't be read. */
export function imageSize(b: Buffer, kind: AvatarKind): { w: number; h: number } | null {
  try {
    if (kind === "png") return b.toString("latin1", 12, 16) === "IHDR" ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) } : null;
    if (kind === "webp") {
      const chunk = b.toString("latin1", 12, 16);
      if (chunk === "VP8X") return { w: 1 + b.readUIntLE(24, 3), h: 1 + b.readUIntLE(27, 3) };
      if (chunk === "VP8L") {
        const bits = b.readUInt32LE(21);
        return { w: 1 + (bits & 0x3fff), h: 1 + ((bits >>> 14) & 0x3fff) };
      }
      if (chunk === "VP8 ") return { w: b.readUInt16LE(26) & 0x3fff, h: b.readUInt16LE(28) & 0x3fff };
      return null;
    }
    // JPEG: walk the segments to the first start-of-frame (not DHT/JPG/DAC).
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1];
      if (marker === 0xff) { i += 1; continue; }
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) { i += 2; continue; }
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
      }
      i += 2 + b.readUInt16BE(i + 2);
    }
    return null;
  } catch {
    return null;
  }
}

/** Remove this user's photos, except `keep` (the one just set). With no `keep`: all of them
 *  (account deletion). Pages through the folder, so nothing is left behind. */
export async function removeUserAvatars(db: SupabaseClient, userId: string, keep?: string): Promise<void> {
  for (let page = 0; page < 20; page++) {
    const { data } = await db.storage.from(AVATAR_BUCKET).list(userId, { limit: 100 });
    const stale = (data ?? []).map((f) => `${userId}/${f.name}`).filter((p) => p !== keep);
    if (!stale.length) return;
    await db.storage.from(AVATAR_BUCKET).remove(stale);
  }
}
