"use client";

import { useEffect, useRef, useState } from "react";
import type { Product, ProductCategory } from "@/lib/types";
import type { ProductLookupResponse } from "@/app/api/product-lookup/route";

/**
 * "Add your own item": paste an Amazon product URL, we look it up (Creators API,
 * with a demo fallback while the account is eligibility-gated) and hand the
 * resolved Product back to the result page, which handles the budget check and
 * canvas placement. Errors (bad link, not found, API down) render inline.
 */
export default function AddOwnItemModal({
  onClose,
  onAdd,
}: {
  onClose: () => void;
  onAdd: (product: Product, category: ProductCategory | null, demo: boolean) => void;
}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    const u = url.trim();
    if (!u) {
      setError("Paste an Amazon product link to add it.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/product-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const data = (await res.json().catch(() => ({}))) as ProductLookupResponse;
      if (!res.ok || !data.ok || !data.product) {
        setError(data.error ?? "Couldn't add that item. Try a different Amazon link.");
        setLoading(false);
        return;
      }
      onAdd(data.product, data.category ?? null, data.demo ?? false);
      onClose();
    } catch {
      setError("Couldn't reach the lookup. Check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-own-title"
    >
      <div
        className="w-full max-w-md rounded-2xl border border-ink/10 bg-white p-6 shadow-[0_40px_120px_-30px_rgba(23,23,43,0.55)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-cobalt/10 text-cobalt">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </span>
          <div>
            <h2 id="add-own-title" className="font-display text-lg font-bold tracking-tight text-ink">
              Add your own item
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-ink-soft">
              Paste an Amazon product link and we&apos;ll pull it into your list and budget.
            </p>
          </div>
        </div>

        <label htmlFor="own-url" className="sr-only">
          Amazon product URL
        </label>
        <input
          id="own-url"
          ref={inputRef}
          type="url"
          inputMode="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (error) setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !loading) submit();
          }}
          placeholder="https://www.amazon.com/…/dp/B0…"
          className="mt-4 w-full rounded-xl border border-ink/15 bg-white px-3.5 py-3 text-sm text-ink outline-none transition-colors placeholder:text-ink-soft/55 focus:border-cobalt"
        />

        {error && (
          <p className="mt-2.5 flex items-start gap-2 rounded-lg border border-[#c2321e]/30 bg-[#c2321e]/[0.06] px-3 py-2 text-sm leading-snug text-ink" role="alert">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 text-[#c2321e]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
            </svg>
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2.5 text-sm font-semibold text-ink-soft transition-colors hover:text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg bg-cobalt px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep disabled:cursor-not-allowed disabled:bg-ink/15 disabled:text-ink-soft"
          >
            {loading && (
              <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
              </svg>
            )}
            {loading ? "Fetching…" : "Add item"}
          </button>
        </div>
      </div>
    </div>
  );
}
