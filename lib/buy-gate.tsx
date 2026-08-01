"use client";

// Gates the result page's "Buy" / "Buy all" links behind sign-in. A logged-out
// click is intercepted (the caller preventDefaults), we stash the destination,
// and open the shared auth modal. On the sign-in that follows we resume
// automatically: open the stored Amazon URL in a new tab. If the browser blocks
// that pop-up (it can, since the open happens just after an async login rather
// than a direct user click), we surface a one-tap "Continue to Amazon" notice
// instead. Either way the in-progress room is untouched: the modal is an
// overlay, so the result page never unmounts and its store/session state is
// preserved right through the login.
//
// Scope: this provider wraps only the result page's shopping surfaces, so buy
// links elsewhere (e.g. a shared /room/[id]) keep their normal behavior.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useAuth } from "@/lib/auth-context";

interface PendingBuy {
  url: string;
  /** Side effects that would have run on the original click (analytics, intent). */
  onProceed: () => void;
}

interface BuyGateValue {
  /**
   * Call from a Buy link's onClick. Returns true when the click was intercepted
   * (the caller must preventDefault and not navigate); false when the user is
   * already signed in and the link should proceed as a normal outbound click.
   */
  gate: (url: string, onProceed: () => void) => boolean;
}

const BuyGateContext = createContext<BuyGateValue | null>(null);

function openAmazon(url: string): boolean {
  // Not "noopener" in the feature string: that makes window.open always return
  // null, so we couldn't tell a real open from a blocked one. Instead we sever
  // the opener by hand on success, keeping the same security posture.
  const w = window.open(url, "_blank");
  if (w) {
    w.opener = null;
    return true;
  }
  return false;
}

export function BuyGateProvider({ children }: { children: React.ReactNode }) {
  const { user, openAuthModal, modalOpen } = useAuth();
  const pendingRef = useRef<PendingBuy | null>(null);
  const userRef = useRef(user);
  userRef.current = user;
  // Set only when an auto-resume was blocked by the pop-up blocker: a friendly,
  // one-tap fallback so the user still reaches Amazon.
  const [readyUrl, setReadyUrl] = useState<string | null>(null);

  const gate = useCallback(
    (url: string, onProceed: () => void): boolean => {
      if (userRef.current) return false; // signed in: let the link do its thing
      pendingRef.current = { url, onProceed };
      openAuthModal("buy");
      return true;
    },
    [openAuthModal]
  );

  // Resume once sign-in lands: user flips from null to set with a buy pending.
  useEffect(() => {
    if (!user) return;
    const pending = pendingRef.current;
    if (!pending) return;
    pendingRef.current = null;
    pending.onProceed();
    if (!openAmazon(pending.url)) setReadyUrl(pending.url);
  }, [user]);

  // If the modal closes without a sign-in (the user backed out), drop the
  // pending buy so a later, unrelated login can't trigger a surprise redirect.
  useEffect(() => {
    if (!modalOpen && !userRef.current) pendingRef.current = null;
  }, [modalOpen]);

  const value = useMemo<BuyGateValue>(() => ({ gate }), [gate]);

  return (
    <BuyGateContext.Provider value={value}>
      {children}
      {readyUrl && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-x-0 bottom-0 z-[70] flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        >
          <div className="snap-in w-full max-w-md rounded-xl border border-ink/10 bg-white p-4 shadow-[0_20px_50px_-20px_rgba(23,23,43,0.45)]">
            <div className="flex items-center gap-3">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-highlight/60 text-ink"
                aria-hidden="true"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path
                    d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-ink">Signed in and ready</p>
                <p className="mt-0.5 text-sm text-ink-soft">
                  Continue to Amazon to finish checking out.
                </p>
              </div>
              <a
                href={readyUrl}
                target="_blank"
                rel="noopener sponsored"
                onClick={() => setReadyUrl(null)}
                className="shrink-0 rounded-full bg-cobalt px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-cobalt-deep"
              >
                Continue
              </a>
            </div>
          </div>
        </div>
      )}
    </BuyGateContext.Provider>
  );
}

/**
 * Returns null when no BuyGateProvider is mounted, so buy links used outside the
 * result page (e.g. a shared /room/[id]) keep their default outbound behavior.
 */
export function useBuyGate(): BuyGateValue | null {
  return useContext(BuyGateContext);
}
