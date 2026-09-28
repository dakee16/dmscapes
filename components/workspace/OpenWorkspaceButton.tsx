"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { currentSnapshot, workspaceRequest } from "@/lib/workspace-client";
export default function OpenWorkspaceButton() {
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
  return <div><button className="dm-button" onClick={() => void open()} disabled={busy}>{busy ? "Opening…" : "Open workspace ↗"}</button>{error && <p role="alert" className="mt-2 max-w-sm text-sm text-red-700">{error}</p>}</div>;
}
