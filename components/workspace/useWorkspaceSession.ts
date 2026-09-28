"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlannerStore } from "@/lib/store";
import { suspendPlannerStorage } from "@/lib/planner-storage";
import { currentSnapshot, loadSnapshot, workspaceRequest, WorkspaceError } from "@/lib/workspace-client";
import { snapshotKey, type WorkspaceDetail } from "@/lib/workspace";
import type { SaveRoomRequest } from "@/lib/api-types";

export function useWorkspaceSession(id: string, userId?: string) {
  const [detail, setDetail] = useState<WorkspaceDetail | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState<"loading" | "saved" | "unsaved" | "saving" | "conflict" | "offline">("loading");
  const [recovery, setRecovery] = useState<{ snapshot: SaveRoomRequest; revision: number } | null>(null);
  const control = useRef({ revision: 0, baseline: "", loading: true, saving: false, canEdit: false, conflict: false, stopped: false });
  const recoverKey = userId ? `dormscape-workspace:${userId}:${id}` : "";
  const saveRef = useRef<() => Promise<boolean>>(async () => false);
  const accept = useCallback((next: WorkspaceDetail) => {
    const c = control.current;
    c.loading = true;
    loadSnapshot({ ...next.workspace.snapshot, name: next.workspace.name });
    c.revision = next.workspace.revision;
    c.baseline = snapshotKey(currentSnapshot()!);
    c.canEdit = next.canEdit;
    c.conflict = false;
    c.loading = false;
    setDetail(next); setStatus("saved"); setError("");
  }, []);

  const refresh = useCallback(async (force = false) => {
    const c = control.current;
    let next: WorkspaceDetail;
    try { next = await workspaceRequest<WorkspaceDetail>(`/api/workspaces/${id}`); }
    catch (e) {
      if (control.current !== c || c.stopped) return;
      if (e instanceof WorkspaceError && [401,403,404].includes(e.status)) {
        c.canEdit = false; c.loading = true; setDetail(null); setError(e.message);
      }
      throw e;
    }
    if (c.stopped || control.current !== c || (!force && next.workspace.revision < c.revision)) return;
    c.canEdit = next.canEdit;
    const current = currentSnapshot();
    if (force || c.loading || (!c.saving && next.workspace.revision > c.revision && current && snapshotKey(current) === c.baseline)) {
      accept(next);
    } else {
      setDetail(next);
      if (!c.saving && next.workspace.revision > c.revision) { c.conflict = true; setStatus("conflict"); }
    }
  }, [id, accept]);

  saveRef.current = async () => {
    const c = control.current, snapshot = currentSnapshot();
    if (c.loading || c.stopped || c.saving || c.conflict || !c.canEdit || !snapshot) return false;
    const key = snapshotKey(snapshot);
    if (key === c.baseline) return true;
    c.saving = true; setStatus("saving");
    try {
      const response = await workspaceRequest<{ revision: number }>(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify({ action: "save", snapshot, revision: c.revision }) });
      if (c.stopped || control.current !== c) return false;
      c.revision = response.revision; c.baseline = key;
      setError("");
      setStatus(snapshotKey(currentSnapshot()!) === key ? "saved" : "unsaved");
      try { if (snapshotKey(currentSnapshot()!) === key) sessionStorage.removeItem(recoverKey); } catch { /* Recovery is best effort. */ }
      return true;
    } catch (e) {
      if (c.stopped || control.current !== c) return false;
      if (e instanceof WorkspaceError && e.status === 409) { c.conflict = true; setStatus("conflict"); }
      else { setStatus("offline"); setError(e instanceof Error ? e.message : "Couldn't save. Keep this tab open and retry."); }
      return false;
    } finally { c.saving = false; }
  };

  useEffect(() => {
    if (!userId) return;
    const c = { revision: 0, baseline: "", loading: true, saving: false, canEdit: false, conflict: false, stopped: false };
    control.current = c;
    setDetail(null); setStatus("loading"); setError("");
    const backup = usePlannerStore.getState();
    suspendPlannerStorage(true);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let mounted = true;
    let priorRecovery: string | null = null;
    try { priorRecovery = sessionStorage.getItem(recoverKey); } catch {}
    void refresh().then(() => {
      if (!mounted) return;
      try {
        const raw = priorRecovery;
        if (raw) { const value = JSON.parse(raw); if (value.snapshot && Number.isInteger(value.revision) && snapshotKey(value.snapshot) !== c.baseline) setRecovery(value); }
      } catch { /* Invalid device recovery is ignored; cloud data remains authoritative. */ }
    }).catch(e => { if (mounted) setError(e.message); });
    const unsubscribe = usePlannerStore.subscribe(() => {
      if (c.loading || c.stopped || !c.canEdit) return;
      const snapshot = currentSnapshot(); if (!snapshot) return;
      if (snapshotKey(snapshot) === c.baseline) return;
      try { sessionStorage.setItem(recoverKey, JSON.stringify({ snapshot, revision: c.revision })); } catch { /* UI never claims a device backup succeeded. */ }
      if (c.conflict) return;
      setStatus("unsaved"); clearTimeout(timer);
      timer = setTimeout(() => void saveRef.current(), 1100);
    });
    const poll = setInterval(() => {
      if (document.hidden || c.loading) return;
      if (!c.conflict && !c.saving && c.canEdit) void saveRef.current().then(() => refresh().catch(() => {}));
      else void refresh().catch(() => {});
    }, 8000);
    const unload = (e: BeforeUnloadEvent) => { const current = currentSnapshot(); if (current && !c.loading && snapshotKey(current) !== c.baseline) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("beforeunload", unload);
    return () => {
      mounted = false; c.stopped = true; clearTimeout(timer); clearInterval(poll); unsubscribe();
      window.removeEventListener("beforeunload", unload);
      usePlannerStore.setState(backup); suspendPlannerStorage(false);
    };
  }, [userId, id, refresh, recoverKey]);

  async function action(action: string, payload: Record<string, unknown> = {}) {
    if (["restore", "checkpoint"].includes(action)) {
      if (!await saveRef.current()) throw new Error("Save or resolve your current changes first.");
      const current = currentSnapshot();
      if (!current || snapshotKey(current) !== control.current.baseline) throw new Error("Your latest edit is still saving. Try again in a moment.");
    }
    const result = await workspaceRequest<Record<string, unknown>>(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify({ action, ...payload, revision: control.current.revision }) });
    if (["leave", "delete"].includes(action)) {
      control.current.canEdit = false;
      discardRecovery();
    } else await refresh(action === "restore");
    return result;
  }
  function recover() {
    if (!recovery || !detail?.canEdit) return;
    loadSnapshot(recovery.snapshot);
    if (recovery.revision !== control.current.revision) { control.current.conflict = true; setStatus("conflict"); }
    setRecovery(null);
  }
  function discardRecovery() { setRecovery(null); try { sessionStorage.removeItem(recoverKey); } catch {} }
  return { detail, error, status, recovery, recover, discardRecovery, action,
    save: () => saveRef.current(), refresh, revision: control.current.revision };
}
