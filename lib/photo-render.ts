// SERVER ONLY. "See it in your room": a Pro member's room photo, dressed in their
// plan by an image model through Vercel AI Gateway. The plan goes to the model in
// words (vibe and shopping list), never as product photos.
import type { SupabaseClient } from "@supabase/supabase-js";
import { styleById } from "./styles";
import type { StyleId } from "./types";

/** Nano Banana 2 (Gemini 3.1 Flash Image), from https://ai-gateway.vercel.sh/v1/models. */
export const PHOTO_MODEL = "google/gemini-3.1-flash-image";
export const PHOTO_BUCKET = "room-photos";
/** Renders a member can make in 24 hours, on top of the credit each one spends. */
export const PHOTO_DAILY_LIMIT = 20;
/** The browser shrinks photos to 1600 px JPEG first, so real uploads are far smaller. */
export const PHOTO_MAX_BYTES = 4 * 1024 * 1024;
export const PHOTO_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
/** Gemini image models are language models on AI Gateway: they edit through chat with image output. */
const GATEWAY_CHAT = "https://ai-gateway.vercel.sh/v1/chat/completions";

export interface PhotoDesign {
  roomType: string;
  occupants: number;
  lengthFt: number;
  widthFt: number;
  style: string | null;
  styleName: string;
  vibe: string;
  items: string[];
}

const clean = (v: unknown, max: number) =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f<>]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : "";

/** The plan the browser sends, checked and trimmed; null if it isn't a usable room. */
export function parseDesign(raw: unknown): PhotoDesign | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const occupants = Number(r.occupants);
  const lengthFt = Number(r.lengthFt);
  const widthFt = Number(r.widthFt);
  if (!Number.isInteger(occupants) || occupants < 1 || occupants > 8) return null;
  if (!(lengthFt >= 4 && lengthFt <= 60 && widthFt >= 4 && widthFt <= 60)) return null;
  const roomType = clean(r.roomType, 40).replace(/_/g, " ") || "dorm room";
  let style: string | null = null;
  let styleName = "";
  let vibe = "";
  if (r.style === "custom") {
    style = "custom";
    styleName = clean(r.customVibe, 80) || "custom";
    vibe = styleName;
  } else if (typeof r.style === "string") {
    const s = styleById(r.style as StyleId);
    if (s.id === r.style) {
      style = s.id;
      styleName = s.name;
      vibe = `${s.name} (${s.keywords.join(", ")})`;
    }
  }
  const items = (Array.isArray(r.items) ? r.items : []).map((x) => clean(x, 90)).filter(Boolean).slice(0, 16);
  return { roomType, occupants, lengthFt, widthFt, style, styleName: styleName || "dorm", vibe: vibe || "simple, tidy dorm", items };
}

/** The instruction for the image model. */
export function photoPrompt(d: PhotoDesign): string {
  const who = d.occupants === 1 ? "one student" : `${d.occupants} roommates`;
  return [
    `Edit this photo of a college dorm room: a ${d.roomType} for ${who}, about ${Math.round(d.lengthFt)} by ${Math.round(d.widthFt)} feet.`,
    "Keep the room itself exactly as it is. The walls, floor, ceiling, windows, doors, radiators, built-in furniture, camera angle and lighting must not change.",
    `Furnish and decorate it in a ${d.vibe} style, with Twin XL beds made up.`,
    d.items.length ? `Include these pieces from the student's shopping list, at realistic dorm scale: ${d.items.join("; ")}.` : "",
    "Put each piece where it would really go in this room, and keep the floor walkable.",
    "Photorealistic, natural light. No people, no text, no logos, no watermarks.",
  ]
    .filter(Boolean)
    .join(" ");
}

const imageType = (b: Buffer) =>
  b[0] === 0xff && b[1] === 0xd8 ? "image/jpeg" : b.subarray(8, 12).toString("latin1") === "WEBP" ? "image/webp" : "image/png";
export const extensionOf = (type: string) => (type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png");

/** Send the photo and instruction to the image model through AI Gateway. Throws on any failure. */
export async function renderPhoto(photo: Blob, prompt: string): Promise<{ image: Buffer; type: string; usage: unknown }> {
  const key = process.env.AI_GATEWAY_API_KEY;
  if (!key) throw new Error("AI_GATEWAY_API_KEY is not set");
  const photoUrl = `data:${photo.type || "image/jpeg"};base64,${Buffer.from(await photo.arrayBuffer()).toString("base64")}`;
  const res = await fetch(GATEWAY_CHAT, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: PHOTO_MODEL,
      modalities: ["text", "image"],
      stream: false,
      messages: [{ role: "user", content: [{ type: "text", text: prompt }, { type: "image_url", image_url: { url: photoUrl } }] }],
    }),
    signal: AbortSignal.timeout(110_000),
  });
  const body = (await res.json().catch(() => null)) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
    usage?: unknown;
    error?: { type?: string; message?: string };
  } | null;
  const b64 = body?.choices?.[0]?.message?.images?.[0]?.image_url?.url?.split(";base64,")[1];
  if (!res.ok || typeof b64 !== "string") {
    throw new Error(`AI Gateway ${res.status} ${body?.error?.type ?? ""}: ${body?.error?.message ?? "no image returned"}`.slice(0, 400));
  }
  const image = Buffer.from(b64, "base64");
  return { image, type: imageType(image), usage: body?.usage ?? null };
}

/** One-hour links to private files, keyed by path. */
export async function signedUrls(db: SupabaseClient, paths: string[]): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data } = await db.storage.from(PHOTO_BUCKET).createSignedUrls(paths, 60 * 60);
  return Object.fromEntries((data ?? []).flatMap((x) => (x.path && x.signedUrl ? [[x.path, x.signedUrl]] : [])));
}

export async function removePhotoFiles(db: SupabaseClient, paths: (string | null)[]): Promise<void> {
  const list = paths.filter((p): p is string => Boolean(p));
  if (list.length) await db.storage.from(PHOTO_BUCKET).remove(list);
}

/** Every room photo and render a member has, for account deletion. Quiet if the feature isn't set up. */
export async function removeUserPhotos(db: SupabaseClient, userId: string): Promise<void> {
  const { data, error } = await db.from("photo_renders").select("photo_path, render_path").eq("user_id", userId);
  if (error || !data) return;
  await removePhotoFiles(db, data.flatMap((r) => [r.photo_path, r.render_path]));
}
