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
  const { user, openAuthModal } = useAuth();
  const PENDING_BUY_KEY = "dormscape-pending-buy";
  const pendingRef = useRef<PendingBuy | null>(null);
  const userRef = useRef(user);
  userRef.current = user;
  // Set only when an auto-resume was blocked by the pop-up blocker: a friendly,
  // one-tap fallback so the user still reaches Amazon.
  const [readyUrl, setReadyUrl] = useState<string | null>(null);

  const gate = useCallback(
    (url: string, onProceed: () => void): boolean => {
      if (userRef.current) return false; // signed in: let the link do its thing
      // Auth is a full page now, so this surface unmounts during login. Stash the
      // destination in sessionStorage (with a timestamp) so we can resume the buy
      // when the user lands back here signed in.
      try {
        window.sessionStorage.setItem(
          PENDING_BUY_KEY,
          JSON.stringify({ url, ts: Date.now() })
        );
      } catch {
        /* private mode etc.; the in-tab ref below still covers same-tab resumes */
      }
      pendingRef.current = { url, onProceed };
      openAuthModal("buy");
      return true;
    },
    [openAuthModal]
  );

  // Resume once sign-in lands: the buy survives the navigation to /login via
  // sessionStorage, and the in-tab ref covers the (now rare) same-tab case.
  useEffect(() => {
    if (!user) return;
    let pending = pendingRef.current;
    pendingRef.current = null;
    if (!pending) {
      try {
        const raw = window.sessionStorage.getItem(PENDING_BUY_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { url?: string; ts?: number };
          // Only a fresh intent (< 5 min) resumes, so a stale back-out can never
          // surprise-open Amazon on a later, unrelated login.
          if (parsed.url && Date.now() - (parsed.ts ?? 0) < 5 * 60 * 1000) {
            pending = { url: parsed.url, onProceed: () => {} };
          }
        }
      } catch {
        /* ignore */
      }
    }
    try {
      window.sessionStorage.removeItem(PENDING_BUY_KEY);
    } catch {
      /* ignore */
    }
    if (!pending) return;
    pending.onProceed();
    if (!openAmazon(pending.url)) setReadyUrl(pending.url);
  }, [user]);

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
