"use client";

import { useEffect, useRef, useState } from "react";
import Modal from "@/components/site/Modal";
import { CloseIcon } from "@/components/ds/Icons";
import { usePlannerStore } from "@/lib/store";
import { getBrowserClient } from "@/lib/supabase-browser";
import { CATEGORY_LABELS } from "@/lib/catalog";
import { track } from "@/lib/analytics";
import { PHOTO_RENDER_CREDITS } from "@/lib/plan";
import type { Product } from "@/lib/types";
import dlg from "@/components/plan-steps/Dialogs.module.css";
import css from "./RoomPhotoModal.module.css";

interface Render {
  id: string;
  photoUrl: string | null;
  renderUrl: string;
  styleName?: string | null;
}
type Step = "pick" | "ready" | "working" | "done";

/** Photos go up as 1600 px JPEG: smaller, quicker, and stripped of location data. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  if (Math.max(bitmap.width, bitmap.height) < 500) throw new Error("small");
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.86));
}

async function token(): Promise<string | null> {
  const supabase = getBrowserClient();
  return supabase ? (await supabase.auth.getSession()).data.session?.access_token ?? null : null;
}

/** Drag (or arrow-key) between the photo and the picture. */
function BeforeAfter({ before, after }: { before: string | null; after: string }) {
  const [at, setAt] = useState(50);
  const [ratio, setRatio] = useState(4 / 3);
  return (
    <div className={css.compare} style={{ aspectRatio: ratio }}>
      {/* Private, short-lived links: plain <img>, not next/image. */}
      <img src={after} alt="Your room, dressed in your plan (AI illustration)" className={css.img}
        onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight || 4 / 3)} />
      {before && (
        <>
          <img src={before} alt="" aria-hidden="true" className={css.img} style={{ clipPath: `inset(0 ${100 - at}% 0 0)` }} />
          <span className={css.handle} style={{ left: `${at}%` }} aria-hidden="true" />
          <span className={`${css.tag} ${css.tagBefore}`}>Your photo</span>
          <span className={`${css.tag} ${css.tagAfter}`}>Your plan</span>
          <input type="range" min={0} max={100} value={at} onChange={(e) => setAt(Number(e.target.value))}
            className={css.range} aria-label="Slide between your photo and the picture" />
        </>
      )}
    </div>
  );
}

/**
 * "See it in your room" (Pro): a photo of the student's own room, dressed by an
 * image model in this plan's vibe and shopping list. PHOTO_RENDER_CREDITS a
 * picture; pictures are kept 14 days. Opened from the result page's action bar.
 */
export default function RoomPhotoModal({ products, onClose }: { products: Product[]; onClose: () => void }) {
  const [step, setStep] = useState<Step>("pick");
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<Render | null>(null);
  const [recent, setRecent] = useState<Render[]>([]);
  const [error, setError] = useState("");
  const [left, setLeft] = useState<number | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    track("photo_render_opened");
    let live = true;
    (async () => {
      const t = await token();
      if (!t) return;
      const res = await fetch("/api/photo-render", { headers: { Authorization: `Bearer ${t}` } }).catch(() => null);
      const data = (await res?.json().catch(() => null)) as { renders?: Render[] } | null;
      if (live && data?.renders) setRecent(data.renders);
    })();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && step !== "working" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, step]);

  async function choose(file: File | undefined) {
    if (!file) return;
    setError("");
    try {
      const blob = await shrink(file);
      setPhoto(blob);
      setPreview(URL.createObjectURL(blob));
      setStep("ready");
    } catch (e) {
      setError(
        e instanceof Error && e.message === "small"
          ? "That photo is too small. Use one at least 500 pixels across."
          : "We couldn't open that photo. Try a JPG or PNG."
      );
    }
  }

  async function render() {
    const s = usePlannerStore.getState();
    if (!photo || !s.room) return;
    setStep("working");
    setError("");
    track("photo_render_started", { style: s.style ?? "none" });
    const form = new FormData();
    form.set("photo", photo, "room.jpg");
    form.set(
      "design",
      JSON.stringify({
        roomType: s.room.type,
        occupants: s.room.occupants,
        lengthFt: s.room.lengthFt,
        widthFt: s.room.widthFt,
        style: s.style,
        customVibe: s.customVibe,
        items: products.slice(0, 16).map((p) => `${CATEGORY_LABELS[p.category]}: ${p.name.slice(0, 70)}`),
      })
    );
    try {
      const t = await token();
      if (!t) throw new Error("Sign in to see your plan in your room.");
      const res = await fetch("/api/photo-render", { method: "POST", headers: { Authorization: `Bearer ${t}` }, body: form });
      const data = (await res.json().catch(() => ({}))) as Partial<Render> & { error?: string; remaining?: number };
      if (typeof data.remaining === "number") setLeft(data.remaining);
      if (!res.ok || !data.renderUrl) throw new Error(data.error ?? "We couldn't make the picture. Please try again.");
      setResult({ id: data.id!, photoUrl: data.photoUrl ?? null, renderUrl: data.renderUrl });
      setStep("done");
      track("photo_render_done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't make the picture. Please try again.");
      setStep("ready");
      track("photo_render_failed");
    }
  }

  async function download() {
    if (!result) return;
    try {
      const blob = await (await fetch(result.renderUrl)).blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `dormscape-in-my-room.${blob.type === "image/jpeg" ? "jpg" : blob.type === "image/webp" ? "webp" : "png"}`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    } catch {
      window.open(result.renderUrl, "_blank", "noopener");
    }
  }

  function again() {
    setResult(null);
    setPhoto(null);
    setPreview(null);
    setStep("pick");
  }

  return (
    <Modal className={dlg.layer} onClick={() => step !== "working" && onClose()} role="dialog" aria-modal="true" aria-labelledby="room-photo-title">
      <div className={`${dlg.card} ${css.card}`} onClick={(e) => e.stopPropagation()}>
        <div className={dlg.head}>
          <div>
            <p className={dlg.eyebrow}>
              Pro · {PHOTO_RENDER_CREDITS} plan {PHOTO_RENDER_CREDITS === 1 ? "credit" : "credits"} a picture
            </p>
            <h2 id="room-photo-title" className={dlg.title}>
              See it in <em>your room.</em>
            </h2>
          </div>
          <button type="button" className={dlg.close} onClick={onClose} disabled={step === "working"} aria-label="Close">
            <CloseIcon size={20} />
          </button>
        </div>

        {step === "done" && result ? (
          <>
            <BeforeAfter before={result.photoUrl} after={result.renderUrl} />
            <p className={css.label}>
              AI illustration, not to scale. Your plan is the exact version.
              {left !== null && <> {left} {left === 1 ? "credit" : "credits"} left.</>}
            </p>
            <div className={dlg.actions}>
              <button type="button" className={dlg.secondary} onClick={again}>
                Try another photo
              </button>
              <button type="button" className={dlg.primary} onClick={download}>
                Download
              </button>
            </div>
            <p className={css.note}>Pictures and photos are deleted after 14 days.</p>
          </>
        ) : step === "pick" ? (
          <>
            <p className={dlg.text}>
              Add a photo of your dorm room and we&apos;ll dress it in this plan: your vibe and your shopping list. An
              empty room, or the photo from your housing portal, works too.
            </p>
            <ul className={css.tips}>
              <li>Stand in a corner and get as much floor and wall in as you can.</li>
              <li>Daylight or the lights on. Hold the phone level.</li>
            </ul>
            <input ref={input} type="file" accept="image/*" className="ds-sr" tabIndex={-1}
              onChange={(e) => choose(e.target.files?.[0])} />
            {error && <p className={css.error} role="alert">{error}</p>}
            <div className={dlg.actions}>
              <button type="button" className={dlg.primary} onClick={() => input.current?.click()}>
                Choose a photo
              </button>
            </div>
            {recent.length > 0 && (
              <div className={css.recent}>
                <p className={dlg.eyebrow}>Your pictures, last 14 days</p>
                <ul>
                  {recent.map((r) => (
                    <li key={r.id}>
                      <button type="button" onClick={() => { setResult(r); setStep("done"); }}
                        aria-label={`Open your ${r.styleName ?? ""} picture`}>
                        <img src={r.renderUrl} alt="" />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <>
            <div className={css.preview} data-working={step === "working" || undefined}>
              {preview && <img src={preview} alt="The photo of your room you chose" className={css.img} />}
              {step === "working" && (
                <p className={css.working} role="status">
                  Dressing your room… about 20 seconds
                </p>
              )}
            </div>
            {error && <p className={css.error} role="alert">{error}</p>}
            <div className={dlg.actions}>
              <button type="button" className={dlg.secondary} onClick={again} disabled={step === "working"}>
                Choose another
              </button>
              <button type="button" className={dlg.primary} onClick={render} disabled={step === "working"}>
                {step === "working" ? "Working…" : `Make my picture · ${PHOTO_RENDER_CREDITS} ${PHOTO_RENDER_CREDITS === 1 ? "credit" : "credits"}`}
              </button>
            </div>
            <p className={css.note}>
              Your photo goes to our image model (Google Gemini, through Vercel) to make the picture. We keep both for 14
              days, then delete them.
            </p>
          </>
        )}
      </div>
    </Modal>
  );
}
