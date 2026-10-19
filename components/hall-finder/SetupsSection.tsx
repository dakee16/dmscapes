"use client";

// "My Hall Finder" on /rooms (Plus and Pro): saved setups, each reopening the finder with
// its places. Hidden until Hall Finder is live or previewed, and when saving is unavailable.
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { encodeDraft, NO_FILTERS, type Filters } from "@/lib/hall-finder";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { track } from "@/lib/analytics";
import { useHallFinderOn } from "./useHallFinderOn";
import { hallFinderHeaders, type SavedSetup } from "./api";

export default function SetupsSection() {
  const on = useHallFinderOn();
  const { user, profile } = useAuth();
  const [setups, setSetups] = useState<SavedSetup[] | null>(null);
  useEffect(() => {
    if (!on || !user) return;
    (async () => {
      const res = await fetch("/api/hall-finder/setups", { headers: await hallFinderHeaders(profile) }).catch(() => null);
      const json = res?.ok ? ((await res.json()) as { setups: SavedSetup[] }) : null;
      setSetups(json?.setups ?? null);
    })();
  }, [on, user, profile]);
  async function remove(id: string) {
    const res = await fetch("/api/hall-finder/setups", { method: "DELETE", headers: await hallFinderHeaders(profile), body: JSON.stringify({ id }) });
    if (res.ok) setSetups((s) => s?.filter((x) => x.id !== id) ?? null);
  }
  if (!on || !setups) return null;
  return (
    <section id="hall-finder" className="ds-wrap" style={{ marginTop: 40, marginBottom: 40 }} aria-labelledby="hf-setups-title">
      <p className="ds-eyebrow">Hall Finder</p>
      <h2 id="hf-setups-title" style={{ margin: "6px 0 12px" }}>My Hall Finder</h2>
      {!setups.length ? (
        <p style={{ color: "var(--ds-body)" }}>Rank halls by your classes and your setups save here. <Link href="/hall-finder" className="ds-link" onClick={() => track("hall_finder_entry_clicked", { where: "more" })}>Open Hall Finder</Link></p>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {setups.map((s) => {
            const school = getSchool(s.collegeId);
            const draft = { places: s.places.map((p) => ({ ...p, source: p.pin ? ("pin" as const) : p.label ? ("ics" as const) : ("manual" as const) })), filters: { ...NO_FILTERS, ...s.filters } as Filters };
            return (
              <li key={s.id} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, padding: "12px 0", borderTop: "1.5px solid rgba(22,22,29,.08)" }}>
                <span style={{ flex: "1 1 220px" }}>
                  <strong>{s.name}</strong>
                  <span style={{ display: "block", fontSize: 13, color: "var(--ds-muted)" }}>
                    {school ? shortName(school) : s.collegeId} · {s.places.length} {s.places.length === 1 ? "place" : "places"} · {new Date(s.updatedAt).toLocaleDateString()}
                    {s.shareToken ? " · Shared" : ""}
                  </span>
                </span>
                <Link href={`/colleges/${s.collegeId}/hall-finder?s=${encodeDraft(draft)}&view=results&setup=${s.id}`} className="ds-btn ds-btn--ink-yellow ds-btn--sm">Open</Link>
                <button type="button" className="ds-btn ds-btn--ghost-ink ds-btn--sm" onClick={() => remove(s.id)} aria-label={`Delete ${s.name}`}>Delete</button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
