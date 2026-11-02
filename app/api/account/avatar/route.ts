import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import { AVATAR_BUCKET, AVATAR_MAX_BYTES, imageKind, ownAvatarPath } from "@/lib/avatars";

export const runtime = "nodejs";

const NOT_READY = "Profile photos aren't switched on yet. Check back soon.";

/** Set your profile photo (multipart "photo"). Replaces, then removes, the previous one. */
export async function POST(request: Request) {
  const rl = rateLimit(request, "avatar", 10, 10 * 60 * 1000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many uploads. Give it a few minutes." }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Sign in to add a profile photo." }, { status: 401 });
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: NOT_READY }, { status: 503 });

  const form = await request.formData().catch(() => null);
  const file = form?.get("photo");
  if (!(file instanceof Blob) || file.size === 0) return NextResponse.json({ error: "Choose a photo first." }, { status: 400 });
  if (file.size > AVATAR_MAX_BYTES) return NextResponse.json({ error: "That photo is too big. Try a smaller one." }, { status: 413 });
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = imageKind(bytes);
  if (!kind) return NextResponse.json({ error: "Use a JPEG, PNG or WebP photo." }, { status: 415 });

  const path = `${userId}/${crypto.randomUUID()}.${kind === "jpeg" ? "jpg" : kind}`;
  const { error: uploadError } = await db.storage
    .from(AVATAR_BUCKET)
    .upload(path, bytes, { contentType: `image/${kind}`, upsert: false, cacheControl: "31536000" });
  if (uploadError) return NextResponse.json({ error: NOT_READY }, { status: 503 });
  const url = db.storage.from(AVATAR_BUCKET).getPublicUrl(path).data.publicUrl;

  const { data: before } = await db.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const { error } = await db.from("profiles").update({ avatar_url: url }).eq("id", userId);
  if (error) {
    await db.storage.from(AVATAR_BUCKET).remove([path]);
    return NextResponse.json({ error: NOT_READY }, { status: 503 });
  }
  const old = ownAvatarPath(before?.avatar_url, userId);
  if (old) await db.storage.from(AVATAR_BUCKET).remove([old]);
  return NextResponse.json({ avatar_url: url });
}

/** Remove your profile photo (initials show again). */
export async function DELETE(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  const db = getServiceClient();
  if (!db) return NextResponse.json({ error: NOT_READY }, { status: 503 });
  const { data: before } = await db.from("profiles").select("avatar_url").eq("id", userId).maybeSingle();
  const { error } = await db.from("profiles").update({ avatar_url: null }).eq("id", userId);
  if (error) return NextResponse.json({ error: NOT_READY }, { status: 503 });
  const old = ownAvatarPath(before?.avatar_url, userId);
  if (old) await db.storage.from(AVATAR_BUCKET).remove([old]);
  return NextResponse.json({ avatar_url: null });
}
