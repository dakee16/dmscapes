"use client";

import Modal from "@/components/site/Modal";

import { useEffect, useRef, useState } from "react";
import type { Product, ProductCategory } from "@/lib/types";
import { getBrowserClient } from "@/lib/supabase-browser";
import type { ProductLookupResponse } from "@/app/api/product-lookup/route";
import { AlertIcon, CloseIcon } from "@/components/studio-ui/icons";
import d from "./Dialog.module.css";

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
      const token = (await getBrowserClient()?.auth.getSession())?.data.session?.access_token;
      const res = await fetch("/api/product-lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
    <Modal
      className={d.layer}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-own-title"
    >
      <div className={d.card} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={d.close} onClick={onClose} aria-label="Close"><CloseIcon size={20} /></button>
        <p className={d.eyebrow}>Plus · Your own product</p>
        <h2 id="add-own-title" className={d.title}>
          Add your <em>own item.</em>
        </h2>
        <p className={d.body}>
          Paste an Amazon product link and we&apos;ll pull it into your list and budget.
        </p>

        <label htmlFor="own-url" className={d.label}>
          Amazon product link
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
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "own-url-error" : undefined}
          placeholder="https://www.amazon.com/…/dp/B0…"
          className={d.input}
        />

        {error && (
          <p id="own-url-error" className={d.error} role="alert">
            <AlertIcon size={16} />
            {error}
          </p>
        )}

        <div className={d.actions}>
          <button type="button" onClick={onClose} className={d.secondary}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={loading} className={d.primary}>
            {loading && (
              <svg viewBox="0 0 24 24" width="16" height="16" className={d.spin} fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.2-8.6" strokeLinecap="round" />
              </svg>
            )}
            {loading ? "Fetching…" : "Add item"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
