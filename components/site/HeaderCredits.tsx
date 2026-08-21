"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { headerCreditState, planLabel, RECHARGE_PRICE_USD } from "@/lib/plan";
import BuyCreditsForm from "@/components/site/BuyCreditsForm";

// Compact design-credits chip that lives INSIDE the header island, just left of
// the profile avatar (see Nav). Desktop only (md+); on mobile the avatar badge +
// profile dropdown carry this instead.
//
// Pro shows a static ∞. Free, Flex, and Plus show a live "Designs · N" count
// that doubles as a button: clicking it opens a small popover to buy à-la-carte
// $0.99 credits (quantity + live price). When the count hits zero the chip turns
// into a cobalt "Buy credits" call to action. Plus keeps its 5-for-$2.99
// recharge as a secondary option inside the popover.
export default function HeaderCredits() {
  const { user, profile } = useAuth();
  const { openUpgrade } = useUpgrade();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const c = headerCreditState(profile);

  // Close the popover on outside click, Escape, and route change.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);

  if (!user || !profile) return null;

  // Pro: unlimited, nothing to buy.
  if (c.unlimited) {
    return (
      <span
        className="hidden shrink-0 items-center gap-1 rounded-full border border-cobalt/25 bg-cobalt/[0.06] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-cobalt md:inline-flex"
        title="Room designs left"
      >
        Designs <span aria-hidden="true">·</span>
        <span className="text-[15px] leading-none">&infin;</span>
      </span>
    );
  }

  return (
    <div ref={rootRef} className="relative hidden shrink-0 md:block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Buy room-design credits"
        className={
          c.empty
            ? "flex cursor-pointer items-center rounded-full bg-cobalt px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-white transition-colors hover:bg-cobalt-deep"
            : "flex cursor-pointer items-baseline gap-1 rounded-full border border-cobalt/25 bg-cobalt/[0.06] px-3 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-cobalt transition-colors hover:bg-cobalt/[0.12]"
        }
      >
        {c.empty ? (
          "Buy credits"
        ) : (
          <>
            Designs <span aria-hidden="true">·</span>
            <span className="text-[13px] leading-none">{c.designsLeft}</span>
          </>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Buy design credits"
          className="absolute right-0 top-full z-50 mt-2.5 w-[22rem] max-w-[calc(100vw-1.5rem)] origin-top-right rounded-2xl border border-ink/10 bg-white p-5 shadow-[0_24px_60px_-24px_rgba(23,23,43,0.5)]"
        >
          <div className="mb-3.5 flex items-center justify-between gap-2 border-b border-ink/8 pb-3">
            <span className="font-display text-base font-bold tracking-tight text-ink">
              Buy plan credits
            </span>
            <span className="shrink-0 rounded-full bg-ink/6 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide text-ink-soft">
              {planLabel(profile)} · {c.designsLeft} left
            </span>
          </div>
          <BuyCreditsForm source="header" autoFocus onStarted={() => setOpen(false)} />
          {c.plus && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                openUpgrade("plan-credits");
              }}
              className="mt-3.5 block w-full cursor-pointer border-t border-ink/8 pt-3.5 text-center text-[13px] font-medium text-ink-soft transition-colors hover:text-ink"
            >
              Prefer the 5-pack? Recharge for ${RECHARGE_PRICE_USD.toFixed(2)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
