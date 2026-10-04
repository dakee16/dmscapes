"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { currentSnapshot, workspaceRequest } from "@/lib/workspace-client";
import { ArrowRight } from "@/components/ds/Icons";

/** Opens the current plan as a workspace. Sits in the planner header beside
 * the 2D/3D tabs; the host styles it through `className` and picks the long
 * or short label (`[data-label]`) for the space it has. */
export default function OpenWorkspaceButton({ className }: { className?: string }) {
  const { user } = useAuth(), router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  async function open() {
    if (!user) { router.push("/login?next=%2Fplan%2Fresult&reason=save-design"); return; }
    const snapshot = currentSnapshot(); if (!snapshot) return;
    setBusy(true); setError("");
    try {
      const response = await workspaceRequest<{ id: string }>("/api/workspaces", { method: "POST", body: JSON.stringify({ snapshot }) });
      router.push(`/rooms/${response.id}`);
    } catch (e) { setError((e as Error).message); setBusy(false); }
  }
  return <div className={className}><button type="button" onClick={() => void open()} disabled={busy}
    title="Save this layout and its shopping list in your own workspace. Invite your roommates with Pro.">{busy ? "Opening…" : <><span data-label="long">Open workspace</span><span data-label="short">Workspace</span><ArrowRight size={15} /></>}</button>{error && <p role="alert">{error}</p>}</div>;
}
