import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/supabase-server";
import { getUserId } from "@/lib/supabase-auth";
import { rateLimit } from "@/lib/rate-limit";
import { addPlanCredits, spendPlanCredit } from "@/lib/credit-ledger";
import { isPro } from "@/lib/plan";
import {
  PHOTO_DAILY_LIMIT,
  PHOTO_MAX_BYTES,
  PHOTO_MODEL,
  PHOTO_TYPES,
  PHOTO_BUCKET,
  extensionOf,
  parseDesign,
  photoPrompt,
  removePhotoFiles,
  renderPhoto,
  signedUrls,
} from "@/lib/photo-render";

// Storage and credits use the server-only service client; the model can take ~30 s.
export const runtime = "nodejs";
export const maxDuration = 120;

const NOT_READY = "Photo renders aren't switched on yet. Check back soon.";
const fail = (error: string, status: number, extra: Record<string, unknown> = {}) => NextResponse.json({ error, ...extra }, { status });

/**
 * Make one "See it in your room" picture: the member's room photo dressed in
 * their plan. Pro only, PHOTO_RENDER_CREDITS (one) each, refunded if the picture fails.
 * Body: multipart form with `photo` (JPEG/PNG/WebP) and `design` (JSON, see
 * parseDesign).
 */
export async function POST(request: Request) {
  const rl = rateLimit(request, "photo-render", 10, 10 * 60 * 1000);
  if (!rl.allowed) return fail("Too many pictures at once. Give it a minute.", 429);

  const userId = await getUserId(request);
  if (!userId) return fail("Sign in to see your plan in your room.", 401);
  const db = getServiceClient();
  if (!db || !process.env.AI_GATEWAY_API_KEY) return fail(NOT_READY, 503);

  const { data: profile } = await db.from("profiles").select("plan").eq("id", userId).maybeSingle();
  if (!isPro(profile)) return fail("Seeing your plan in your room is a Pro feature.", 403, { upgrade: true });

  const form = await request.formData().catch(() => null);
  const photo = form?.get("photo");
  if (!(photo instanceof Blob) || !PHOTO_TYPES.has(photo.type) || photo.size < 1024 || photo.size > PHOTO_MAX_BYTES) {
    return fail("Choose a JPG, PNG or WebP photo of your room.", 400);
  }
  let rawDesign: unknown = null;
  try {
    rawDesign = JSON.parse(String(form?.get("design") ?? ""));
  } catch {}
  const design = parseDesign(rawDesign);
  if (!design) return fail("Open your room plan first, then try again.", 400);

  // The daily cap, read from the table (an error here means the migration hasn't run).
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error: countError } = await db
    .from("photo_renders")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", since);
  if (countError) {
    console.error("photo renders unavailable:", countError.message);
    return fail(NOT_READY, 503);
  }
  if ((count ?? 0) >= PHOTO_DAILY_LIMIT) return fail(`That's ${PHOTO_DAILY_LIMIT} pictures today. Try again tomorrow.`, 429);

  const { data: row, error: insertError } = await db
    .from("photo_renders")
    .insert({ user_id: userId, model: PHOTO_MODEL, design })
    .select("id, expires_at")
    .single();
  if (insertError || !row) {
    console.error("photo render insert failed:", insertError?.message);
    return fail(NOT_READY, 503);
  }

  let spend: { blocked: boolean; remaining: number };
  try {
    spend = await spendPlanCredit(db, userId);
  } catch (error) {
    console.error("photo render credit failed:", error);
    await db.from("photo_renders").delete().eq("id", row.id);
    return fail("Could not check your credits. Please try again.", 503);
  }
  if (spend.blocked) {
    await db.from("photo_renders").delete().eq("id", row.id);
    return fail("You're out of plan credits for this picture.", 402, { blocked: true, remaining: 0 });
  }

  const photoPath = `${userId}/${row.id}/photo.jpg`;
  let renderPath: string | null = null;
  try {
    const up = await db.storage.from(PHOTO_BUCKET).upload(photoPath, photo, { contentType: photo.type, upsert: true });
    if (up.error) throw new Error(`photo upload: ${up.error.message}`);
    const out = await renderPhoto(photo, photoPrompt(design));
    renderPath = `${userId}/${row.id}/render.${extensionOf(out.type)}`;
    const saved = await db.storage.from(PHOTO_BUCKET).upload(renderPath, out.image, { contentType: out.type, upsert: true });
    if (saved.error) throw new Error(`render upload: ${saved.error.message}`);
    await db
      .from("photo_renders")
      .update({ status: "done", photo_path: photoPath, render_path: renderPath, usage: out.usage ?? null })
      .eq("id", row.id);
    const urls = await signedUrls(db, [photoPath, renderPath]);
    return NextResponse.json({
      id: row.id,
      photoUrl: urls[photoPath] ?? null,
      renderUrl: urls[renderPath] ?? null,
      expiresAt: row.expires_at,
      remaining: spend.remaining,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("photo render failed:", message);
    let refunded = true;
    await addPlanCredits(db, userId, 1).catch((e) => {
      refunded = false;
      console.error("photo render refund failed:", e);
    });
    await removePhotoFiles(db, [photoPath, renderPath]).catch(() => {});
    await db.from("photo_renders").update({ status: "failed", error: message.slice(0, 500) }).eq("id", row.id);
    return fail(
      refunded
        ? "We couldn't make the picture this time, and your credit is back. Try again or use another photo."
        : "We couldn't make the picture this time. Contact us and we'll return your credit.",
      502,
      { remaining: spend.remaining + (refunded ? 1 : 0) }
    );
  }
}

/** The member's pictures from the last 14 days, newest first, with one-hour links. */
export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return fail("Sign in to see your pictures.", 401);
  const db = getServiceClient();
  if (!db) return NextResponse.json({ renders: [] });
  const { data, error } = await db
    .from("photo_renders")
    .select("id, photo_path, render_path, design, created_at, expires_at")
    .eq("user_id", userId)
    .eq("status", "done")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(12);
  if (error || !data) return NextResponse.json({ renders: [] });
  const urls = await signedUrls(db, data.flatMap((r) => [r.photo_path, r.render_path].filter(Boolean)));
  return NextResponse.json({
    renders: data
      .filter((r) => r.render_path && urls[r.render_path])
      .map((r) => ({
        id: r.id,
        photoUrl: r.photo_path ? urls[r.photo_path] ?? null : null,
        renderUrl: urls[r.render_path],
        styleName: (r.design as { styleName?: string } | null)?.styleName ?? null,
        createdAt: r.created_at,
        expiresAt: r.expires_at,
      })),
  });
}
