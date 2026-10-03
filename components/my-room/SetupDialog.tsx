"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { workspaceRequest } from "@/lib/workspace-client";
import { WORKSPACE_MEMBER_LIMIT, type WorkspaceDetail } from "@/lib/workspace";
import type { FurnitureItem, RoomOutline } from "@/lib/types";
import Modal, { ModalClose } from "@/components/site/Modal";
import { ArrowRight, Check } from "@/components/ds/Icons";
import { SwapIcon } from "@/components/studio-ui/icons";
import PlanSketch from "./PlanSketch";
import { applySplit, type SplitMode } from "./split";
import s from "./MyRoom.module.css";

export type DesignOption = { key: string; kind: "saved" | "workspace"; id: string; name: string; meta: string; lengthFt: number; widthFt: number; furniture: FurnitureItem[]; outline: RoomOutline | null };
const SPLITS: { k: SplitMode; label: string; desc: string }[] = [
  { k: "middle", label: "Down the middle", desc: "One line, wall to wall. The classic." },
  { k: "beds", label: "By bed", desc: "Each of you gets your bed side. The middle strip is shared." },
  { k: "none", label: "No line", desc: "Everything starts shared. Mark things as you go." },
];
type Row = { email: string; role: "editor" | "commenter" };

/** Open as My Room: pick a design, draw the line, invite your people. Uses the
 * existing workspace API: create (or reuse) the workspace, save the split,
 * share it, then send email invitations. */
export default function SetupDialog({ userId, options, initial, onClose }: { userId: string; options: DesignOption[]; initial?: string; onClose: () => void }) {
  const router = useRouter();
  const [step, setStep] = useState(initial ? 2 : 1);
  const [pick, setPick] = useState(initial ?? options[0]?.key ?? "");
  const [split, setSplit] = useState<SplitMode>("middle"), [mineLeft, setMineLeft] = useState(true);
  const [rows, setRows] = useState<Row[]>([{ email: "", role: "editor" }]);
  const [busy, setBusy] = useState(""), [error, setError] = useState(""), [made, setMade] = useState<string | null>(null);
  const design = options.find(o => o.key === pick);
  const seats = WORKSPACE_MEMBER_LIMIT - 1;
  const emails = rows.filter(r => r.email.trim());

  async function finish() {
    if (!design) return;
    setError("");
    let id = made;
    try {
      if (!id) {
        setBusy("Opening your room…");
        id = design.kind === "workspace" ? design.id : (await workspaceRequest<{ id: string }>("/api/workspaces", { method: "POST", body: JSON.stringify({ source_room_id: design.id }) })).id;
        setMade(id);
        setBusy("Drawing the line…");
        const detail = await workspaceRequest<WorkspaceDetail>(`/api/workspaces/${id}`);
        const snapshot = applySplit({ ...detail.workspace.snapshot, name: detail.workspace.name }, userId, split, mineLeft);
        await workspaceRequest(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify({ action: "save", snapshot, revision: detail.workspace.revision }) });
        setBusy("Sharing it…");
        if (!detail.workspace.shared) await workspaceRequest(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify({ action: "share", enabled: true }) });
      }
      const failed: string[] = [];
      for (const r of emails) {
        setBusy(`Inviting ${r.email.trim()}…`);
        try { await workspaceRequest(`/api/workspaces/${id}`, { method: "PATCH", body: JSON.stringify({ action: "invite", email: r.email.trim(), role: r.role }) }); }
        catch (e) { failed.push(`${r.email.trim()}: ${(e as Error).message}`); }
      }
      if (failed.length) { setRows(rows.filter(r => failed.some(f => f.startsWith(`${r.email.trim()}:`)))); setError(failed.join(" ")); setBusy(""); return; }
      router.push(`/rooms/${id}`);
    } catch (e) { setError((e as Error).message); setBusy(""); }
  }
  const stepNames = ["Pick a design", "Draw the line", "Invite your people"];
  return <Modal className={s.setupLayer} aria-labelledby="setup-title" onKeyDown={e => { if (e.key === "Escape" && !busy) onClose(); }} onClick={() => { if (!busy) onClose(); }}>
    <div className={s.setup} onClick={e => e.stopPropagation()}>
      <nav className={s.setupNav} aria-label="Steps">
        <div className={s.setupTags}><span>My Room</span><span>Pro</span></div>
        <p className={s.setupTitle}>Open as<br /><em>My Room</em></p>
        <ol>{stepNames.map((label, i) => { const n = i + 1; return <li key={label}><button type="button" aria-current={step === n ? "step" : undefined} disabled={!!busy || (n > 1 && !design)} onClick={() => setStep(n)}><span data-done={n < step}>{n < step ? <Check size={13} /> : `0${n}`}</span>{label}</button></li>; })}</ol>
        <div className={s.setupTape} aria-hidden="true" />
        <p className={s.setupFine}>Pro hosts one active shared room at a time. The design you pick stays saved as it is.</p>
      </nav>
      <div className={s.setupBody}>
        <ModalClose onClick={onClose} disabled={!!busy} className={s.setupClose} />
        {step === 1 && <div>
          <p className={s.stepEyebrow}>Step 1 of 3</p>
          <h2 id="setup-title">Pick the design <em>you&apos;ll share.</em></h2>
          <p className={s.stepLede}>Its room, furniture, list and budget come along. Everyone you invite sees this design.</p>
          {options.length ? <div className={s.designs} role="radiogroup" aria-label="Design">
            {options.map(o => <button key={o.key} type="button" role="radio" aria-checked={pick === o.key} className={s.design} onClick={() => setPick(o.key)}>
              <span className={s.designPlan}><PlanSketch lengthFt={o.lengthFt} widthFt={o.widthFt} furniture={o.furniture} outline={o.outline} maxWidth={180} maxHeight={110} /></span>
              <strong>{o.name}</strong><small>{o.meta}</small>
            </button>)}
          </div> : <div className={s.noDesigns}><p>Save a design first: plan your room, then open it here as your shared room.</p><Link href="/plan" className="ds-btn ds-btn--ink-yellow ds-btn--sm">Plan my room<ArrowRight size={16} /></Link></div>}
        </div>}
        {step === 2 && design && <div>
          <p className={s.stepEyebrow}>Step 2 of 3 · {design.name}</p>
          <h2 id="setup-title">Draw <em>the line.</em></h2>
          <p className={s.stepLede}>Everything on your side starts as yours, theirs as theirs, and anything on the line as shared. You can change any of it later.</p>
          <div className={s.splitGrid}>
            <div className={s.splits} role="radiogroup" aria-label="How to split the room">
              {SPLITS.map(p => <button key={p.k} type="button" role="radio" aria-checked={split === p.k} onClick={() => setSplit(p.k)}><strong>{p.label}</strong><span>{p.desc}</span></button>)}
            </div>
            <div>
              <div className={s.splitPreview}><PlanSketch lengthFt={design.lengthFt} widthFt={design.widthFt} furniture={design.furniture} outline={design.outline} split={split} mineLeft={mineLeft} maxWidth={400} maxHeight={280}
                label={split === "middle" ? "Preview: the room split down the middle" : split === "beds" ? "Preview: each bed side is private, the middle strip is shared" : "Preview: the whole room starts shared"} /></div>
              {split !== "none" && <div className={s.sides}>
                <span data-side={mineLeft ? "me" : "them"}>{mineLeft ? <><i data-c="me" />You, left</> : <><i data-c="them" />Roommate, left</>}</span>
                <button type="button" aria-label="Swap sides" onClick={() => setMineLeft(v => !v)}><SwapIcon size={16} /></button>
                <span data-side={mineLeft ? "them" : "me"}>{mineLeft ? <><i data-c="them" />Roommate, right</> : <><i data-c="me" />You, right</>}</span>
              </div>}
            </div>
          </div>
        </div>}
        {step === 3 && design && <div>
          <p className={s.stepEyebrow}>Step 3 of 3 · {seats} seats left</p>
          <h2 id="setup-title">Invite <em>your people.</em></h2>
          <p className={s.stepLede}>Up to {seats} more people. They join free with the email you invite, and they never spend your credits.</p>
          <div className={s.invites}>
            {rows.map((r, i) => <div key={i} className={s.inviteRow}>
              <label><span className="ds-sr">Email {i + 1}</span><input type="email" autoComplete="off" maxLength={254} placeholder={i === 0 ? "roommate@school.edu" : "their@email.com"} value={r.email} disabled={!!busy} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, email: e.target.value } : x))} /></label>
              <label><span className="ds-sr">Access for email {i + 1}</span><select value={r.role} disabled={!!busy} onChange={e => setRows(rows.map((x, j) => j === i ? { ...x, role: e.target.value as Row["role"] } : x))}><option value="editor">Can edit</option><option value="commenter">Can comment</option></select></label>
            </div>)}
            {rows.length < seats && <button type="button" className={s.addRow} disabled={!!busy} onClick={() => setRows([...rows, { email: "", role: "commenter" }])}>+ Add another ({seats - rows.length} seat{seats - rows.length === 1 ? "" : "s"} left)</button>}
            <p className={s.inviteFine}>Roommates usually get <strong>Can edit</strong>; a parent who wants a say gets <strong>Can comment</strong>. Each invitation goes by email, works only for that address, and holds a seat for seven days. You can invite later from the room too.</p>
          </div>
        </div>}
        {error && <p className={s.setupError} role="alert">{error}</p>}
        <footer className={s.setupFoot}>
          <button type="button" className={s.backBtn} disabled={!!busy} style={{ visibility: step > 1 ? "visible" : "hidden" }} onClick={() => setStep(step - 1)}>Back</button>
          <span className={s.footNote} role="status">{busy || "Invitations use no credits"}</span>
          {step < 3 ? <button type="button" className={s.nextBtn} disabled={!design || !!busy} onClick={() => setStep(step + 1)}>{step === 1 ? "Next: draw the line" : "Next: invite"}<ArrowRight size={16} /></button>
            : <button type="button" className={s.goBtn} disabled={!design || !!busy} onClick={() => void finish()}>{busy ? "Working…" : emails.length ? "Send invites & open the room" : made ? "Open the room" : "Open the room"}<ArrowRight size={16} /></button>}
        </footer>
      </div>
    </div>
  </Modal>;
}
