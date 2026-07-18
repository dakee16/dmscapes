"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import type { SaveRoomRequest, SaveRoomResponse } from "@/lib/api-types";
import { cartUrl, totalFor } from "@/lib/catalog";
import { usePlannerStore } from "@/lib/store";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";

type Busy = null | "link" | "save";

export default function ActionBar({
  products,
  getPng,
}: {
  products: Product[];
  getPng: () => string | null;
}) {
  const { user } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [savePanel, setSavePanel] = useState(false);
  const [email, setEmail] = useState("");
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
      },
      style: s.style,
      budget: s.budget,
      template_id: s.templateId,
      furniture_positions: s.furniture,
      selected_products: Object.fromEntries(products.map((p) => [p.category, p.id])),
    };
  }

  async function saveRoom(): Promise<string | null> {
    const body = buildSaveRequest();
    if (!body) return null;
    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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

  function handleDownload() {
    const url = getPng();
    setMenuOpen(false);
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

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setBusy("save");
    try {
      // Signed-in users don't need to type an email; use the account's.
      const saveEmail = user?.email ?? email.trim();
      if (saveEmail) {
        await fetch("/api/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: saveEmail, source: "save-design" }),
        }).catch(() => {});
      }
      const url = await saveRoom();
      if (url) {
        setSavedUrl(url);
        track("share_clicked", { type: "save" });
      }
    } finally {
      setBusy(null);
    }
  }

  const total = totalFor(products);

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
                  className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper"
                >
                  ⬇ Download PNG
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  disabled={busy === "link"}
                  className="block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm font-medium text-ink transition-colors hover:bg-paper disabled:opacity-60"
                >
                  {busy === "link" ? "Creating link…" : "🔗 Copy share link"}
                </button>
              </div>
            )}
          </div>

          <a
            href={cartUrl(products)}
            target="_blank"
            rel="noopener sponsored"
            onClick={() =>
              track("product_clicked", { product_id: "buy_all", price: total, category: "cart" })
            }
            className="rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-cobalt hover:text-cobalt"
          >
            Buy all <span className="font-mono">(${total.toFixed(0)})</span>
          </a>

          <button
            type="button"
            onClick={() => setSavePanel((v) => !v)}
            className="ml-auto cursor-pointer rounded-full border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:border-cobalt hover:text-cobalt"
          >
            Save design
          </button>
        </div>

        {savePanel && (
          <div className="mx-auto mt-3 max-w-6xl">
            {savedUrl ? (
              <p className="rounded-xl border border-ink/10 bg-paper px-4 py-3 text-sm text-ink">
                Saved!{" "}
                <a href={savedUrl} className="font-medium text-cobalt underline">
                  {savedUrl.replace(/^https?:\/\//, "")}
                </a>
              </p>
            ) : (
              <form onSubmit={handleSave} className="flex flex-col gap-2 sm:flex-row">
                {!user && (
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@school.edu (optional, we'll email you the link)"
                    className="h-11 flex-1 rounded-xl border border-ink/15 bg-white px-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/60 focus:border-cobalt"
                  />
                )}
                <button
                  type="submit"
                  disabled={busy === "save"}
                  className="h-11 shrink-0 cursor-pointer rounded-xl bg-cobalt px-5 text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-wait disabled:opacity-70"
                >
                  {busy === "save" ? "Saving…" : "Save my design"}
                </button>
              </form>
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
