"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Product } from "@/lib/types";
import type { SaveRoomRequest, SaveRoomResponse } from "@/lib/api-types";
import { fingerprintState } from "@/lib/planner-fingerprint";
import { useWorkspace } from "@/components/workspace/WorkspaceContext";
import { shoppingProducts } from "@/lib/planning";
import { usePlannerStore } from "@/lib/store";
import { track } from "@/lib/analytics";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { hasFeatures } from "@/lib/plan";
import { getBrowserClient } from "@/lib/supabase-browser";
import { downloadShoppingListPdf } from "@/lib/pdf";
import { CATEGORY_LABELS, totalFor } from "@/lib/catalog";
import { designDisplayName } from "@/lib/styles";
import { roomTypeLabel } from "@/lib/format";
import { formatDims } from "@/lib/schools";
import { ArrowRight } from "@/components/ds/Icons";
import { CheckIcon, CompareIcon, DownloadIcon, ShareIcon } from "@/components/studio-ui/icons";
import a from "./ActionBar.module.css";

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
  exportsOnly = false,
}: {
  products: Product[];
  getPng: () => string | null;
  /** The phone bottom sheet replaced the old cart button; kept for callers. */
  onShop?: () => void;
  shopOpen?: boolean;
  exportsOnly?: boolean;
}) {
  const planning=usePlannerStore(s=>s.planning);
  const buying=shoppingProducts(products,planning);
  const pendingSave=useRef(false);
  const { user, profile, openAuthModal } = useAuth();
  const { openUpgrade } = useUpgrade();
  // PDF/PNG export are premium features: unlocked for Pro and for anyone who has
  // ever bought Plus (stays unlocked even at 0 credits).
  const workspace = useWorkspace();
  const features = hasFeatures(profile) || !!workspace?.ownerPro;
  const actionRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [savePanel, setSavePanel] = useState(false);
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [busy, setBusy] = useState<Busy>(null);
  const [toast, setToast] = useState("");
  const [savedUrl, setSavedUrl] = useState("");
  const [shareFallbackUrl, setShareFallbackUrl] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(()=>{if(user&&pendingSave.current){pendingSave.current=false;setName(usePlannerStore.getState().planning.name);setSavePanel(true);setSavedUrl("");}},[user]);
  useEffect(() => () => { if (toastTimer.current) clearTimeout(toastTimer.current); }, []);

  useEffect(() => {
    if (!menuOpen && !savePanel && !shareOpen) return;
    const onOutside = (event: PointerEvent) => {
      if (!actionRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
        setSavePanel(false);
        setShareOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        actionRef.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]')?.focus();
        setMenuOpen(false);
        setSavePanel(false);
        setShareOpen(false);
      }
    };
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, savePanel, shareOpen]);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 5000);
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
        bed_size: s.room.bedSize,
        estimated: s.room.dimsEstimated ?? false,
        // Hand-drawn rooms carry their outline so a reopened design keeps its
        // real shape and doors/windows/closets.
        outline: s.room.outline ?? null,
        studio: s.room.studio,
        editor: {hiddenItemIds:s.hiddenItemIds,lockedItemIds:s.lockedItemIds,excluded:s.excluded??[],
          customItems:s.customItems,unplacedItemIds:s.unplacedItemIds,customProducts:s.customProducts,
          customVibe:s.customVibe,customMock:s.customMock,customRegenUsed:s.customRegenUsed,cartProducts:products,planning:s.planning},
      },
      style: s.style,
      budget: s.budget,
      template_id: s.templateId,
      furniture_positions: s.furniture,
      selected_products: Object.fromEntries(products.map((p) => [p.category, p.id])),
    };
  }

  // `designName` set = a named "Save design" (needs the auth token); omitted = the
  // anonymous "copy share link" flow. Saving is unlimited, so there's no credit to
  // spend. Returns the share URL, or null on failure.
  async function saveRoom(designName?: string): Promise<{ url: string } | null> {
    const fingerprint=fingerprintState(usePlannerStore.getState());
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
          ? "Sharing is temporarily unavailable. Your room is still here; try again in a moment."
          : "Couldn't save right now. Try again in a minute."
      );
      return null;
    }
    const data = (await res.json()) as SaveRoomResponse;
    if(designName)usePlannerStore.setState({savedFingerprint:fingerprint,savedByUserId:user?.id??null});
    return { url: `${window.location.origin}/room/${data.id}` };
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
    if (buying.length === 0) {
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
        styleName: s.style ? designDisplayName(s.style, s.customVibe) : null,
        budget: s.budget,
        items: buying.map((p) => ({
          name: p.name,
          category: CATEGORY_LABELS[p.category],
          price: p.price,
        })),
        total: totalFor(buying),
      });
      track("plus_pdf_downloaded");
    } catch {
      showToast("Couldn't build the PDF. Try again.");
    }
  }

  async function handleCopyLink() {
    if (busy) return;
    setMenuOpen(false);
    setBusy("link");
    try {
      const result = await saveRoom();
      if (result) {
        try {
          await navigator.clipboard.writeText(result.url);
          setShareFallbackUrl("");
          showToast("Link copied. Send it to your roommate.");
        } catch {
          setShareFallbackUrl(result.url);
          setShareOpen(true);
          showToast("Your share link is ready. Select and copy it below.");
        }
        track("share_clicked", { type: "link" });
      }
    } catch {
      showToast("Couldn't create the link. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  // "Save design": signed-out users sign in first; signed-in users name it.
  function handleSaveClick() {
    setMenuOpen(false);
    setShareOpen(false);
    if (!user) {
      pendingSave.current=true;
      openAuthModal("save-design");
      return;
    }
    setName(usePlannerStore.getState().planning.name);setSavedUrl("");
    setSavePanel((v) => !v);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setNameError("Give your design a name to save it.");
      return;
    }
    // Saving is unlimited: no credit check, just save.
    setBusy("save");
    try {
      usePlannerStore.getState().updatePlanning({name:trimmed});
      const result = await saveRoom(trimmed);
      if (result) {
        setSavedUrl(result.url);
        track("design_saved");
      }
    } catch {
      showToast("Couldn't save your design. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  }

  const tag = !features && <span className={a.tag}>Plus</span>;
  return (
    <>
      <div ref={actionRef} className={a.bar} data-exports-only={exportsOnly || undefined}>
        {!exportsOnly && (
          <Link href="/account/compare" className={`${a.btn} ${a.compare}`}>
            <CompareIcon size={16} className={a.icon} />Compare{tag}
          </Link>
        )}
        <div className={a.wrap}>
          <button
            type="button"
            className={a.btn}
            onClick={() => { setMenuOpen((v) => !v); setSavePanel(false); setShareOpen(false); }}
            aria-expanded={menuOpen}
            aria-controls="design-export-options"
            aria-label={features ? "Export" : "Export, a Plus feature"}
          >
            <DownloadIcon size={16} className={a.icon} /><span className={a.label}>Export</span>{tag}
          </button>
          {menuOpen && (
            <div id="design-export-options" className={a.menu} role="group" aria-label="Downloads">
              <button type="button" onClick={handleDownload}>
                <span>Download PNG</span>{tag}
              </button>
              <button type="button" onClick={handleDownloadPdf}>
                <span>Download list PDF</span>{tag}
              </button>
            </div>
          )}
        </div>
        {!exportsOnly && (
          <div className={a.wrap}>
            <button type="button" className={a.btn} onClick={handleCopyLink} disabled={busy === "link"}
              aria-label={busy === "link" ? "Creating your share link" : "Share: copy a link to this room"}
              aria-expanded={shareFallbackUrl ? shareOpen : undefined} aria-controls={shareFallbackUrl ? "design-share-options" : undefined}>
              <ShareIcon size={16} /><span className={a.label}>{busy === "link" ? "Creating link…" : "Share"}</span>
            </button>
            {shareOpen && shareFallbackUrl && (
              <div id="design-share-options" className={a.menu} role="group" aria-label="Share link">
                <div className={a.fallback}>
                  <label htmlFor="room-share-link">Your room link</label>
                  <input id="room-share-link" readOnly value={shareFallbackUrl}
                    onFocus={(event) => event.currentTarget.select()} />
                </div>
              </div>
            )}
          </div>
        )}
        {!exportsOnly && (
          <div className={a.wrap}>
            {/* Primary action: saving is free and unlimited, and it's the one
                thing that keeps a design from being lost. */}
            <button
              type="button"
              onClick={handleSaveClick}
              aria-expanded={savePanel}
              aria-controls="design-save-panel"
              className={a.save}
            >
              Save
            </button>
            {savePanel && user && (
              <div id="design-save-panel" className={a.savePanel}>
                {savedUrl ? (
                  <div className={a.saved} role="status">
                    <p className={a.savedTitle}><CheckIcon size={16} />Saved to your account</p>
                    <a href={savedUrl} className={a.savedUrl}>{savedUrl.replace(/^https?:\/\//, "")}</a>
                    <Link href="/account" className={a.savedLink}>See it in your designs<ArrowRight size={14} /></Link>
                  </div>
                ) : (
                  <form onSubmit={handleSave}>
                    <label htmlFor="design-name" className={a.saveLabel}>Name this design</label>
                    <div className={a.saveRow}>
                      <input
                        id="design-name"
                        type="text"
                        value={name}
                        autoFocus
                        maxLength={60}
                        onChange={(e) => {
                          setName(e.target.value);
                          setNameError("");
                        }}
                        aria-invalid={Boolean(nameError)}
                        aria-describedby={nameError ? "design-name-error" : undefined}
                        placeholder="Cozy corner"
                      />
                      <button type="submit" disabled={busy === "save"}>
                        {busy === "save" ? "Saving…" : "Save my design"}
                      </button>
                    </div>
                    {nameError && (
                      <p id="design-name-error" className={a.error} role="alert">
                        {nameError}
                      </p>
                    )}
                    <p className={a.saveNote}>Saving is free and doesn&apos;t use a credit.</p>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {toast && (
        <div role="status" className={a.toast}>
          {toast}
        </div>
      )}
    </>
  );
}
