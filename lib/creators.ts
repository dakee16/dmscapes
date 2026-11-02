// SERVER ONLY. Creators (docs/migrations/20261103_creators_avatars.sql): someone with
// CREATOR_MIN_FOLLOWERS+ on Instagram or TikTok applies, puts a short code in their bio
// to show the account is theirs, and the owner approves by hand (one SQL update, which
// also gives them the Creator badge and a creator code named after their username).
import type { SupabaseClient } from "@supabase/supabase-js";
import { customAlphabet } from "nanoid";
import { CREATOR_MIN_FOLLOWERS } from "./plan";

const verifyCode = customAlphabet("ABCDEFGHJKMNPQRSTUVWXYZ23456789", 4);
export const PLATFORMS = ["instagram", "tiktok"] as const;
export type Platform = (typeof PLATFORMS)[number];
const HANDLE = /^[A-Za-z0-9._]{1,30}$/;

export type CreatorStatus = {
  status: "none" | "pending" | "approved" | "rejected";
  platform?: Platform;
  handle?: string;
  followers?: number;
  verifyCode?: string;
  /** Approved creators: their code, and how many people unlocked Plus with it. */
  code?: string | null;
  redemptions?: number;
};

export const profileLink = (platform: Platform, handle: string) =>
  platform === "instagram" ? `https://www.instagram.com/${handle}/` : `https://www.tiktok.com/@${handle}`;

export async function creatorStatus(db: SupabaseClient, userId: string): Promise<CreatorStatus> {
  const { data, error } = await db
    .from("creators")
    .select("platform, handle, followers, verify_code, status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return { status: "none" };
  const out: CreatorStatus = { status: data.status, platform: data.platform, handle: data.handle, followers: data.followers, verifyCode: data.verify_code };
  if (data.status === "approved") {
    const { data: code } = await db.from("creator_codes").select("code").eq("owner_id", userId).maybeSingle();
    out.code = code?.code ?? null;
    if (out.code) {
      const { count } = await db.from("creator_redemptions").select("user_id", { count: "exact", head: true }).eq("code", out.code);
      out.redemptions = count ?? 0;
    }
  }
  return out;
}

export type ApplyResult = { ok: true; status: CreatorStatus; isNew: boolean } | { ok: false; status: number; error: string };

/** Apply (or re-apply after a rejection). Keeps an existing bio code so it doesn't change under them. */
export async function applyAsCreator(db: SupabaseClient, userId: string, body: { platform?: unknown; handle?: unknown; followers?: unknown }): Promise<ApplyResult> {
  const platform = PLATFORMS.find((p) => p === body.platform);
  const handle = typeof body.handle === "string" ? body.handle.trim().replace(/^@/, "") : "";
  const followers = Number(body.followers);
  if (!platform) return { ok: false, status: 400, error: "Pick Instagram or TikTok." };
  if (!HANDLE.test(handle)) return { ok: false, status: 400, error: "That handle doesn't look right. Use letters, numbers, periods and underscores." };
  if (!Number.isSafeInteger(followers) || followers < CREATOR_MIN_FOLLOWERS) {
    return { ok: false, status: 400, error: `Creators need ${CREATOR_MIN_FOLLOWERS.toLocaleString("en-US")} or more followers on Instagram or TikTok.` };
  }
  const { data: me } = await db.from("profiles").select("username").eq("id", userId).maybeSingle();
  if (!me?.username) return { ok: false, status: 400, error: "Set a username first. It becomes your creator code." };

  const current = await creatorStatus(db, userId);
  if (current.status === "approved") return { ok: false, status: 409, error: "You're already a dormscape creator." };
  const row = { platform, handle, followers, status: "pending", applied_at: new Date().toISOString() };
  const { error } =
    current.status === "none"
      ? await db.from("creators").insert({ user_id: userId, verify_code: `DS-${verifyCode()}`, ...row })
      : await db.from("creators").update(row).eq("user_id", userId);
  if (error) return { ok: false, status: 503, error: "Creator applications aren't switched on yet. Check back soon." };
  return { ok: true, status: await creatorStatus(db, userId), isNew: current.status !== "pending" };
}
