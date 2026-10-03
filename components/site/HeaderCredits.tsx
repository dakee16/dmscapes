"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useUpgrade } from "@/lib/upgrade-context";
import { headerCreditState, planLabel, planOf, RECHARGE_PRICE_USD, RECHARGE_CREDITS } from "@/lib/plan";
import BuyCreditsForm from "@/components/site/BuyCreditsForm";
import css from "./HeaderMenus.module.css";

// Compact design-credits pill that lives in the header, just left of the profile
// avatar (see Nav): a strip of tape carrying the live count. 768px and up; on
// phones the avatar badge + profile dropdown carry this instead.
//
// Every tier shows its live balance and a top-up action. Plus also offers a recharge.
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
      if (e.key === "Escape") {
        setOpen(false);
        rootRef.current?.querySelector<HTMLButtonElement>('button[aria-haspopup="dialog"]')?.focus();
      }
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

  return (
    <div ref={rootRef} className={css.root} data-credits>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Buy room-design credits"
        className={css.credits}
        data-empty={c.empty}
      >
        {c.empty ? (
          "Buy credits"
        ) : (
          <>
            <span className={css.count}>{c.designsLeft}</span>
            {c.designsLeft === 1 ? "design" : "designs"}
          </>
        )}
      </button>

      {open && (
        <div role="dialog" aria-label="Buy design credits" className={`${css.pop} ${css.buy}`}>
          <div className={css.buyHead}>
            <p className={css.buyTitle}>Buy plan credits</p>
            <span className={css.tier} data-tier={planOf(profile.plan)}>
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
              className={css.recharge}
            >
              Prefer the {RECHARGE_CREDITS}-pack? Recharge for ${RECHARGE_PRICE_USD.toFixed(2)}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
