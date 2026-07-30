"use client";

// Shared "Upgrade to Plus" modal state, mounted once in app/layout.tsx. Any
// gating point (save cap, PDF export, comparison view, school request) calls
// openUpgrade(reason); the copy adapts, the design stays identical.
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import UpgradeModal from "@/components/site/UpgradeModal";

export type UpgradeReason =
  | "save-limit"
  | "pdf"
  | "compare"
  | "school-request"
  | "style"
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
