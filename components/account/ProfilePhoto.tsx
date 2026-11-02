"use client";

import { useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { bearer } from "@/lib/invites";
import { track } from "@/lib/analytics";
import s from "./account.module.css";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_PICK = 10 * 1024 * 1024; // the original, before it's shrunk
const SIZE = 256;

/** Centre-crop to a square and redraw at 256 px: only the pixels survive (no metadata,
 *  no location, nothing else hidden in the file). WebP where the browser can, else JPEG. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const side = Math.min(bitmap.width, bitmap.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, SIZE, SIZE);
  bitmap.close();
  const as = (type: string) => new Promise<Blob | null>((done) => canvas.toBlob(done, type, 0.86));
  const webp = await as("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await as("image/jpeg");
  if (!blob) throw new Error("encode");
  return blob;
}

/** Add, change or remove the profile photo (Account settings, under the name). */
export default function ProfilePhoto() {
  const { profile, refreshProfile } = useAuth();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(init: RequestInit) {
    const token = await bearer();
    if (!token) throw new Error("Sign in again to change your photo.");
    const res = await fetch("/api/account/avatar", { ...init, headers: { Authorization: `Bearer ${token}` } });
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    if (!res.ok) throw new Error(data?.error ?? "Couldn't save your photo. Try again in a minute.");
    await refreshProfile();
  }

  async function pick(file: File) {
    setError("");
    if (!TYPES.includes(file.type)) return setError("Use a JPEG, PNG or WebP photo.");
    if (file.size > MAX_PICK) return setError("That photo is over 10 MB. Try a smaller one.");
    setBusy(true);
    try {
      let blob: Blob;
      try {
        blob = await shrink(file);
      } catch {
        throw new Error("Couldn't read that photo. Try another one.");
      }
      const form = new FormData();
      form.set("photo", blob, "photo");
      await send({ method: "POST", body: form });
      track("profile_photo_set", { on: true });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setError("");
    setBusy(true);
    try {
      await send({ method: "DELETE" });
      track("profile_photo_set", { on: false });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={s.photoActions}>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
        }}
      />
      <button type="button" className="ds-btn ds-btn--sm ds-btn--ghost-ink" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? "Saving…" : profile?.avatar_url ? "Change photo" : "Add a photo"}
      </button>
      {profile?.avatar_url && (
        <button type="button" className={s.linkBtn} disabled={busy} onClick={() => void remove()}>
          Remove
        </button>
      )}
      <p className={s.photoHint}>JPEG, PNG or WebP, up to 10 MB. We crop it square and shrink it to {SIZE} px.</p>
      {error && (
        <p className={s.formError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
