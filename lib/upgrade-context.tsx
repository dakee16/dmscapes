"use client";

// Shared "Upgrade to Plus" modal state, mounted once in app/layout.tsx. Any
// gating point (plan/save limits, PDF export, comparison view, school request)
// calls openUpgrade(reason); the copy adapts, the design stays identical.
//
// The four metered reasons split by tier AND counter:
//   plan-credits    Plus member out of plan credits  -> recharge / Pro
//   save-credits    Plus member out of save credits  -> recharge / Pro
//   free-plan-limit free account used its 1 plan      -> Plus / Pro
//   free-save-limit free account used its 1 save      -> Plus / Pro
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import UpgradeModal from "@/components/site/UpgradeModal";

export type UpgradeReason =
  | "plan-credits"
  | "save-credits"
  | "free-plan-limit"
  | "free-save-limit"
  | "flex-credits"
  | "pdf"
  | "png"
  | "compare"
  | "school-request"
  | "style"
  | "custom-vibe"
  | "generic";

interface UpgradeContextValue {
  open: boolean;
  reason: UpgradeReason;
  openUpgrade: (reason?: UpgradeReason) => void;
  closeUpgrade: () => void;
}

const UpgradeContext = createContext<UpgradeContextValue | null>(null);

export function UpgradeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<UpgradeReason>("generic");

  const openUpgrade = useCallback((r: UpgradeReason = "generic") => {
    setReason(r);
    setOpen(true);
  }, []);
  const closeUpgrade = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, reason, openUpgrade, closeUpgrade }),
    [open, reason, openUpgrade, closeUpgrade]
  );

  return (
    <UpgradeContext.Provider value={value}>
      {children}
      <UpgradeModal />
    </UpgradeContext.Provider>
  );
}

export function useUpgrade(): UpgradeContextValue {
  const ctx = useContext(UpgradeContext);
  if (!ctx) throw new Error("useUpgrade must be used inside <UpgradeProvider>");
  return ctx;
}
