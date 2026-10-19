import fs from "node:fs/promises";
import path from "node:path";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageShell from "@/components/ds/PageShell";
import Headline from "@/components/ds/Headline";
import { ArrowRight } from "@/components/ds/Icons";
import { getServiceClient } from "@/lib/supabase-server";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { pageMetadata } from "@/lib/seo";
import { DAYS, NO_FILTERS, encodeDraft, hasHallFinder, type Campus, type DraftPlace, type Filters } from "@/lib/hall-finder";

// A shared Hall Finder setup, read-only (design-handoff/hall-finder plan.md "Saved to the
// account"): resolved by token on the server with the service role. Never indexed.
export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "A shared Hall Finder setup", description: "Places and days someone ranked their halls with.", path: "/hall-finder", noIndex: true });

type Setup = { college_id: string; name: string; places: DraftPlace[]; filters: Partial<Filters> };

export default async function SharedSetup(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(token)) notFound();
  const db = getServiceClient();
  if (!db) notFound();
  const { data } = await db.from("hall_finder_setups").select("college_id, name, places, filters").eq("share_token", token).maybeSingle();
  const setup = data as Setup | null;
  const school = setup ? getSchool(setup.college_id) : undefined;
  if (!setup || !school || !hasHallFinder(setup.college_id)) notFound();
  const campus = JSON.parse(await fs.readFile(path.join(process.cwd(), "data", "campus", `${setup.college_id}.json`), "utf8")) as Campus;
  const names = new Map(campus.places.map((p) => [p.id, p.name]));
  const filters = { ...NO_FILTERS, ...setup.filters };
  const places = setup.places.map((p) => ({ ...p, source: p.pin ? ("pin" as const) : p.label ? ("ics" as const) : ("manual" as const) }));
  const open = `/colleges/${setup.college_id}/hall-finder?s=${encodeDraft({ places, filters })}&view=results`;
  const on = (Object.entries({ firstYear: "First-year halls", ac: "Has AC", singles: "Singles", doubles: "Doubles" }) as [keyof Filters, string][]).filter(([k]) => filters[k]).map(([, v]) => v);
  return (
    <PageShell>
      <section className="ds-section">
        <div className="ds-wrap" style={{ maxWidth: 720 }}>
          <p className="ds-eyebrow">{shortName(school)} · Hall Finder · Shared with you</p>
          <Headline className="ds-h2" lines={[{ text: setup.name, riso: true }, { text: "ranked by walking.", serif: true }]} />
          <ol style={{ listStyle: "none", margin: "24px 0 0", padding: 0 }}>
            {setup.places.map((p, i) => (
              <li key={i} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: "1.5px solid rgba(22,22,29,.08)" }}>
                <strong style={{ flex: 1 }}>{p.placeId ? names.get(p.placeId) ?? "A building" : "A dropped pin"}{p.label ? <span style={{ fontWeight: 400, color: "var(--ds-muted)" }}> · {p.label}</span> : null}</strong>
                <span className="ds-mono">{DAYS.filter((_, d) => p.days & (1 << d)).join(" ")}</span>
              </li>
            ))}
          </ol>
          {on.length > 0 && <p style={{ marginTop: 12, color: "var(--ds-body)" }}>Only showing: {on.join(", ")}</p>}
          <p style={{ marginTop: 24 }}>
            <Link href={open} className="ds-btn ds-btn--ink-yellow">Open in Hall Finder <ArrowRight /></Link>
          </p>
          <p style={{ marginTop: 12, fontSize: 14, color: "var(--ds-muted)" }}>Times are walking estimates and don&apos;t include buses. Sign in to see the ranking.</p>
        </div>
      </section>
    </PageShell>
  );
}
