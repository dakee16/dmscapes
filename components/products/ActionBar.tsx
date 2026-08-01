"use client";

import { useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import type { SaveRoomRequest, SaveRoomResponse } from "@/lib/api-types";
import { usePlannerStore } from "@/lib/store";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { hasFeatures } from "@/lib/plan";
import { getBrowserClient } from "@/lib/supabase-browser";
import { downloadShoppingListPdf } from "@/lib/pdf";
import { CATEGORY_LABELS, totalFor } from "@/lib/catalog";
import { styleById } from "@/lib/styles";
import { roomTypeLabel } from "@/lib/format";
import { formatDims } from "@/lib/schools";

type Busy = null | "link" | "save";

/** Current session's access token, so the API can attribute the save to a user. */
async function accessToken(): Promise<string | null> {
  const supabase = getBrowserClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export default function ActionBar({
  products,
  getPng,
}: {
  products: Product[];
  getPng: () => string | null;
}) {
  const { user, profile, openAuthModal } = useAuth();
  const { openUpgrade } = useUpgrade();
  // PDF/PNG export are premium features: unlocked for Pro and for anyone who has
  // ever bought Plus (stays unlocked even at 0 credits).
  const features = hasFeatures(profile);
  const [menuOpen, setMenuOpen] = useState(false);
  const [savePanel, setSavePanel] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [toast, setToast] = useState("");
  const [savedUrl, setSavedUrl] = useState("");

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 3500);
  }

  function buildSaveRequest(): SaveRoomRequest | null {
    const s = usePlannerStore.getState();
    if (!s.room || !s.style || !s.templateId || !s.furniture) return null;
    return {
      college_id: s.college?.id ?? null,
      dorm_id: s.dorm?.id ?? null,
      room_dimensions: {
        length_ft: s.room.lengthFt,
        width_ft: s.room.widthFt,
        room_type: s.room.type,
        occupants: s.room.occupants,
        estimated: s.room.dimsEstimated ?? false,
      },
      style: s.style,
      budget: s.budget,
      template_id: s.templateId,
      furniture_positions: s.furniture,
      selected_products: Object.fromEntries(products.map((p) => [p.category, p.id])),
    };
  }

  // `designName` set = a named "Save design" (needs the auth token); omitted =
  // the anonymous "copy share link" flow.
  async function saveRoom(designName?: string): Promise<string | null> {
    const body = buildSaveRequest();
    if (!body) return null;
    if (designName) body.name = designName;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = await accessToken();
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      showToast(
        res.status === 503
          ? "Sharing links come online soon. Download the PNG for now."
          : "Couldn't save right now. Try again in a minute."
      );
      return null;
    }
    const data = (await res.json()) as SaveRoomResponse;
    return `${window.location.origin}/room/${data.id}`;
  }

  // PNG export is a premium feature now. Free users get the upgrade prompt.
  function handleDownload() {
    setMenuOpen(false);
    if (!features) {
      openUpgrade("png");
      return;
    }
    const url = getPng();
    if (!url) {
      showToast("Canvas isn't ready yet. Try again in a second.");
      return;
    }
    const a = document.createElement("a");
    a.href = url;
    a.download = "dormscape-room.png";
    a.click();
    track("share_clicked", { type: "download" });
  }

  // Plus feature: a clean, printable shopping list. Free users get the upgrade
  // prompt instead.
  async function handleDownloadPdf() {
    setMenuOpen(false);
    if (!features) {
      openUpgrade("pdf");
      return;
    }
    if (products.length === 0) {
      showToast("Nothing to list yet.");
      return;
    }
    const s = usePlannerStore.getState();
    const place = [s.college?.name, s.dorm?.name].filter(Boolean).join(" · ") || null;
    const roomLine = s.room
      ? [roomTypeLabel(s.room), formatDims(s.room.lengthFt, s.room.widthFt)]
          .filter(Boolean)
          .join(" · ")
      : null;
    try {
      await downloadShoppingListPdf({
        place,
        roomLine,
        styleName: s.style ? styleById(s.style).name : null,
        budget: s.budget,
        items: products.map((p) => ({
          name: p.name,
          category: CATEGORY_LABELS[p.category],
          price: p.price,
        })),
        total: totalFor(products),
      });
      track("plus_pdf_downloaded");
    } catch {
      showToast("Couldn't build the PDF. Try again.");
    }
  }

  async function handleCopyLink() {
    setMenuOpen(false);
    setBusy("link");
    try {
      const url = await saveRoom();
      if (url) {
        await navigator.clipboard.writeText(url);
        showToast("Link copied. Send it to your roommate.");
        track("share_clicked", { type: "link" });
      }
    } finally {
      setBusy(null);
    }
  }

  // "Save design": signed-out users sign in first; signed-in users name it.
  function handleSaveClick() {
    if (!user) {
      openAuthModal("save-design");
      return;
    }
    setSavePanel((v) => !v);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Give your design a name to save it.");
      return;
    }
    setBusy("save");
    try {
      const url = await saveRoom(trimmed);
      if (url) {
        setSavedUrl(url);
        track("design_saved");
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ink/10 bg-white/95 px-4 py-3 backdrop-blur lg:static lg:z-auto lg:mt-6 lg:rounded-2xl lg:border lg:px-5 lg:py-4">
        <div className="mx-auto flex max-w-6xl items-center gap-2.5">
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="cursor-pointer rounded-full bg-cobalt px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep"
            >
              Share my room
            </button>
            {menuOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-2 w-52 snap-in rounded-xl border border-ink/10 bg-white p-1.5 shadow-lg">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper"
                >
                  <span>⬇ Download PNG</span>
                  {!features && (
                    <span className="rounded-full bg-highlight px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase leading-none tracking-wide text-ink">
                      Plus
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={busy === "link"}
                  className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper disabled:opacity-60"
                >
                  {busy === "link" ? "Creating link…" : "🔗 Copy share link"}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper"
                >
                  <span>📄 Download list PDF</span>
                  {!features && (
                    <span className="rounded-full bg-highlight px-1.5 py-0.5 font-mono text-[9px] font-semibold uppercase leading-none tracking-wide text-ink">
                      Plus
                    </span>
                  )}
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleSaveClick}
            aria-expanded={savePanel}
            className="ml-auto cursor-pointer rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-cobalt hover:text-cobalt"
          >
            Save design
          </button>
        </div>

        {savePanel && user && (
          <div className="mx-auto mt-3 max-w-6xl">
            {savedUrl ? (
              <div className="rounded-xl border border-ink/10 bg-paper px-4 py-3 text-sm text-ink">
                <p>
                  Saved!{" "}
                  <a href={savedUrl} className="font-medium text-cobalt underline">
                    {savedUrl.replace(/^https?:\/\//, "")}
                  </a>
                </p>
                <Link
                  href="/account"
                  className="mt-1 inline-block font-medium text-cobalt underline decoration-highlight decoration-2 underline-offset-2"
                >
                  See it in your designs →
                </Link>
              </div>
            ) : (
              <>
                <form onSubmit={handleSave} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    type="text"
                    value={name}
                    autoFocus
                    maxLength={60}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError("");
                    }}
                    aria-label="Design name"
                    aria-invalid={Boolean(nameError)}
                    placeholder="Name this design (e.g. Cozy corner)"
                    className="h-11 flex-1 rounded-xl border border-ink/15 bg-white px-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
                  />
                  <button
                    type="submit"
                    disabled={busy === "save"}
                    className="h-11 shrink-0 cursor-pointer rounded-xl bg-cobalt px-5 text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70"
                  >
                    {busy === "save" ? "Saving…" : "Save my design"}
                  </button>
                </form>
                {nameError && (
                  <p className="mt-1.5 text-sm text-[#c2321e]" role="alert">
                    {nameError}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div
          role="status"
          className="snap-in fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-sm font-medium text-white shadow-lg lg:bottom-8"
        >
          {toast}
        </div>
      )}
    </>
  );
}
