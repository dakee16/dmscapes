"use client";

// Hall Finder results. Free accounts (design ResultsFree / ResultsFreePhone): the #1 hall in
// full, the rest as blurred weekly gaps and the Plus card. Plus and Pro (ResultsPlus /
// ResultsPlusPhone): every hall ranked, any hall's routes, compare two side by side.
import Link from "next/link";
import { useState } from "react";
import Modal from "@/components/site/Modal";
import { ArrowRight, CloseIcon } from "@/components/ds/Icons";
import { formatDims } from "@/lib/schools";
import { PLUS_INITIAL_CREDITS, PLUS_PRICE_USD, PLUS_PRICE_WAS_USD } from "@/lib/plan";
import { STYLES } from "@/lib/styles";
import { track } from "@/lib/analytics";
import { formatMinutes, type CampusHall, type Filters, type HallFacts, type RankResult, type RankedHall } from "@/lib/hall-finder";
import styles from "./HallFinder.module.css";

export interface ShownPlace { n: number; name: string; kind: string | null }

const ROOM_WORD: Record<number, string> = { 1: "Single", 2: "Double", 3: "Triple", 4: "Quad" };

/** "Pollock Halls · No AC · Single or double, 15.2 × 11.8 ft" from data/schools. */
export function factsLine(facts: HallFacts | undefined): string {
  if (!facts) return "";
  const kinds = [...new Set(facts.rooms.map((r) => (r.occupants ? ROOM_WORD[r.occupants] : null)).filter(Boolean))] as string[];
  const sized = facts.rooms.find((r) => r.lengthFt && r.widthFt);
  const dims = sized ? formatDims(sized.lengthFt, sized.widthFt) : null;
  const rooms = kinds.length ? `${kinds.map((k, i) => (i ? k.toLowerCase() : k)).join(" or ")}${dims ? `, ${dims}` : ""}` : null;
  const ac = facts.ac === true ? "AC" : facts.ac === false ? "No AC" : null;
  return [facts.area, ac, rooms].filter(Boolean).join(" · ");
}

const minutesText = (m: { minutes: number; approx: boolean }) => `${m.approx ? "≈ " : ""}${Math.max(1, Math.round(m.minutes))} min`;

function HowCounted() {
  return (
    <details className={styles.how}>
      <summary>How this is counted</summary>
      For each place, the days you go × the one-way walk × 2, added up for the week. Walks follow mapped
      paths at an average pace, without buses or the order of your classes. ≈ marks a pin we estimated.
    </details>
  );
}

function UpperTag({ hall }: { hall?: CampusHall }) {
  return hall?.year === "upper" ? <span className={`${styles.tag} ${styles.tagUpper}`}> · Upper-year</span> : null;
}

interface Props {
  collegeId: string;
  schoolName: string;
  result: RankResult;
  halls: Map<string, CampusHall>;
  facts: Record<string, HallFacts>;
  places: ShownPlace[];
  filters: Filters;
  hasYears: boolean;
  selected: string | null;
  /** Index (into places) of the one route a free account sees. */
  routeShown: number | null;
  onSelect: (dormId: string) => void;
  onFilter: (key: keyof Filters, on: boolean) => void;
  onEdit: () => void;
  onUpgrade: () => void;
  /** Plus/Pro: shown once a setup is saved ("Saved to your account."). */
  saveNote?: string;
  onShare?: () => void;
  shareLabel?: string;
}

export default function Results(props: Props) {
  const { result } = props;
  if (result.tier === "free") return <FreeResults {...props} result={result} />;
  if (result.tier === "paid") return <PaidResults {...props} result={result} />;
  return null;
}

function PlanLinks({ collegeId, hall, rank, compact }: { collegeId: string; hall: CampusHall; rank: number; compact?: boolean }) {
  return (
    <>
      <Link
        href={`/plan?school=${collegeId}&dorm=${hall.dormId}`}
        className={`ds-btn ds-btn--ink-yellow ${compact ? "ds-btn--sm" : ""}`}
        onClick={() => track("plan_from_finder", { college: collegeId, dorm: hall.dormId, rank })}
      >
        {compact ? "Plan this room" : `Plan a ${hall.name} room`} <ArrowRight />
      </Link>
      {!compact && (
        <Link href={`/colleges/${collegeId}/${hall.dormId}`} className="ds-btn ds-btn--ghost-ink">
          See the rooms
        </Link>
      )}
    </>
  );
}

function FreeResults({ collegeId, schoolName, result, halls, facts, places, routeShown, onEdit, onUpgrade }: Props & { result: Extract<RankResult, { tier: "free" }> }) {
  const top = result.top;
  const hall = top ? halls.get(top.dormId) : undefined;
  if (!top || !hall) {
    return (
      <>
        <div className={styles.eyebrowRow}>
          <p className={styles.eyebrow}>{schoolName} · Hall Finder</p>
          <button type="button" className={styles.linkBtn} onClick={onEdit}>Edit places</button>
        </div>
        <p className={styles.status}>No halls match those filters. Edit your places to loosen them.</p>
      </>
    );
  }
  const dining = places.findIndex((p) => p.kind === "dining");
  const second = result.others[0];
  return (
    <>
      <div className={styles.eyebrowRow}>
        <p className={styles.eyebrow}><span className={styles.wideOnly}>{schoolName} · </span>Your #1 hall</p>
        {/* Phones edit from the finder's bar (design 08). */}
        <button type="button" className={`${styles.linkBtn} ${styles.wideOnly}`} onClick={onEdit}>Edit places</button>
      </div>
      <h1 className={styles.title}>
        <span className={`${styles.titleBig} ${styles.titleHall} ds-riso`}>{hall.name}</span>
        <span className={`${styles.titleSerif} ds-serif ds-serif--blue`}>is closest to your week.</span>
      </h1>
      <p className={styles.factsLine}>
        {factsLine(facts[hall.dormId])}
        <UpperTag hall={hall} />
      </p>
      <div className={styles.tiles}>
        <div className={`${styles.tile} ${styles.tileInk}`}><b>{formatMinutes(top.weekly)}</b>walking a week</div>
        <div className={styles.tile}><b>{Math.round(top.farthest)} min</b>farthest class</div>
        {dining >= 0 ? (
          <div className={styles.tile}><b>{Math.round(top.perPlace[dining].minutes)} min</b>to dining</div>
        ) : (
          <div className={styles.tile}><b>{places.length}</b>{places.length === 1 ? "place" : "places"}</div>
        )}
      </div>
      <ol className={styles.walks} aria-label={`Walks from ${hall.name}`}>
        {places.map((p, i) => (
          <li key={p.n} className={styles.walk}>
            <span className={styles.pin} aria-hidden="true">{p.n}</span>
            {p.name}
            {routeShown === i && <span className={styles.tag}>Route shown</span>}
            <b>{minutesText(top.perPlace[i])}</b>
          </li>
        ))}
      </ol>
      <div className={styles.actions}>
        <PlanLinks collegeId={collegeId} hall={hall} rank={1} />
      </div>
      {result.count > 1 && (
        <div className={styles.plus}>
          <div className={styles.locks} aria-hidden="true">
            {result.others.slice(0, 2).map((d, i) => (
              <div key={i} className={styles.lock}>
                <span className={styles.pin}>{i + 2}</span>
                <span className={styles.blur} />
                +{Math.max(1, Math.round(d))} min{i === 0 ? " a week" : ""}
              </div>
            ))}
          </div>
          <div className={styles.plusBody}>
            <p className={styles.plusTitle}>See all {result.count} halls ranked, with every route.</p>
            <p className={styles.plusText}>
              {second !== undefined && `Your #2 is only ${Math.max(1, Math.round(second))} ${Math.round(second) === 1 ? "minute" : "minutes"} a week behind. `}
              Compare halls side by side. Plus also has {PLUS_INITIAL_CREDITS} plan credits and all {STYLES.length} vibes.
            </p>
            <div className={styles.plusFoot}>
              <span className={styles.price}>
                <strong>${PLUS_PRICE_USD}</strong>
                <s>${PLUS_PRICE_WAS_USD}</s> one-time
              </span>
              <button type="button" className="ds-btn ds-btn--yellow ds-btn--sm" onClick={onUpgrade}>Get Plus</button>
            </div>
          </div>
        </div>
      )}
      <HowCounted />
    </>
  );
}

const SHOW = 7;

function PaidResults({ collegeId, schoolName, result, halls, facts, places, filters, hasYears, selected, onSelect, onFilter, onEdit, saveNote, onShare, shareLabel }: Props & { result: Extract<RankResult, { tier: "paid" }> }) {
  const [all, setAll] = useState(false);
  const [compare, setCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const ranked = result.ranked;
  const worst = ranked.at(-1)?.weekly ?? 1;
  const best = ranked[0]?.weekly ?? 0;
  const shown = all ? ranked : ranked.slice(0, SHOW);
  const toggleCompare = (id: string, on: boolean) => setCompare((c) => (on ? [...c.filter((x) => x !== id), id].slice(-2) : c.filter((x) => x !== id)));
  const pair = compare.map((id) => ranked.find((r) => r.dormId === id)).filter(Boolean) as RankedHall[];
  const chips: [keyof Filters, string][] = [["ac", "Has AC"], ...(hasYears ? [["firstYear", "First-year halls"] as [keyof Filters, string]] : []), ["singles", "Singles"], ["doubles", "Doubles"]];

  return (
    <>
      {/* On phones this heads the sheet over the map (design 09): "61 halls, ranked." and Edit places. */}
      <div className={styles.rankHead}>
        <div className={styles.eyebrowRow}>
          <p className={`${styles.eyebrow} ${styles.wideOnly}`}>{schoolName} · {result.count} halls · {places.length} {places.length === 1 ? "place" : "places"}</p>
          <button type="button" className={styles.linkBtn} onClick={onEdit}>Edit places</button>
          {onShare && <button type="button" className={`${styles.linkBtn} ${styles.wideOnly}`} onClick={onShare} aria-live="polite">{shareLabel ?? "Share"}</button>}
        </div>
        <h1 className={styles.title}>
          <span className={styles.wideOnly}>
            <span className={`${styles.titleBig} ds-riso`}>Your halls,</span>
            <span className={`${styles.titleSerif} ds-serif ds-serif--blue`}>ranked by walking.</span>
          </span>
          <span className={styles.phoneOnly}>
            {result.count} halls, <span className="ds-serif ds-serif--blue">ranked.</span>
          </span>
        </h1>
      </div>
      <div className={`${styles.chips} ${styles.chipRow}`} role="group" aria-label="Only show">
        {chips.map(([k, label]) => (
          <button key={k} type="button" className={styles.chip} aria-pressed={filters[k]} onClick={() => onFilter(k, !filters[k])}>{label}</button>
        ))}
      </div>
      {!ranked.length && <p className={styles.status}>No halls match those filters.</p>}
      <ol className={styles.ranked} aria-label="Halls, shortest week first">
        {shown.map((r, i) => {
          const hall = halls.get(r.dormId);
          if (!hall) return null;
          const ac = facts[r.dormId]?.ac;
          if (r.dormId === selected) {
            return (
              <li key={r.dormId} className={styles.card}>
                <div className={styles.cardTop}>
                  <span className={styles.rank} style={{ background: "var(--ds-yellow)", color: "var(--ds-ink)", boxShadow: "inset 0 0 0 2px var(--ds-ink)" }}>{i + 1}</span>
                  <span className={styles.nm}>
                    <strong>{hall.name}<UpperTag hall={hall} /></strong>
                    <span>{factsLine(facts[r.dormId])}</span>
                  </span>
                  <span className={styles.cardTime}><strong>{formatMinutes(r.weekly)}</strong>a week · farthest {Math.round(r.farthest)} min</span>
                </div>
                <div className={styles.minis}>
                  {places.map((p, j) => (
                    <span key={p.n} className={styles.mini}><i aria-hidden="true">{p.n}</i><span className="ds-sr">{p.name}: </span>{minutesText(r.perPlace[j])}</span>
                  ))}
                </div>
                <div className={styles.cardActions}>
                  <PlanLinks collegeId={collegeId} hall={hall} rank={i + 1} compact />
                  <label className={styles.check}>
                    <input type="checkbox" checked={compare.includes(r.dormId)} onChange={(e) => toggleCompare(r.dormId, e.target.checked)} />
                    Compare
                  </label>
                  <Link href={`/colleges/${collegeId}/${hall.dormId}`}>Hall details</Link>
                </div>
              </li>
            );
          }
          const share = worst > best ? (r.weekly - best) / (worst - best) : 0;
          return (
            <li key={r.dormId}>
              <button type="button" className={styles.row} onClick={() => onSelect(r.dormId)} aria-label={`${i + 1}. ${hall.name}, ${formatMinutes(r.weekly)} a week. Show routes.`}>
                <span className={styles.rank}>{i + 1}</span>
                <span className={styles.nm}>
                  <strong>
                    {hall.name}
                    <UpperTag hall={hall} />
                    {compare.includes(r.dormId) && <span className={styles.tag}> · Comparing</span>}
                  </strong>
                  <span className={styles.track}><span className={styles.fill} style={{ width: `${Math.round(45 + share * 55)}%`, background: share < 0.5 ? "#2449FF" : "#5B7CFF" }} /></span>
                </span>
                <span className={styles.ac}>{ac === true ? "AC" : ac === false ? "No AC" : ""}</span>
                <span className={styles.t}>{formatMinutes(r.weekly)}</span>
              </button>
            </li>
          );
        })}
      </ol>
      {ranked.length > 1 && (
        <p className={styles.foot}>
          Farthest hall: {halls.get(ranked.at(-1)!.dormId)?.name}, {formatMinutes(worst)} a week.{" "}
          {!all && ranked.length > SHOW && (
            <button type="button" className={styles.linkBtn} onClick={() => setAll(true)}>Show all {ranked.length}</button>
          )}
        </p>
      )}
      <HowCounted />
      {pair.length === 2 && (
        <div className={styles.compareBar}>
          <span><strong>{halls.get(pair[0].dormId)?.name}</strong> vs <strong>{halls.get(pair[1].dormId)?.name}</strong></span>
          <span>{formatMinutes(Math.abs(pair[0].weekly - pair[1].weekly))} a week apart</span>
          <button type="button" className="ds-btn ds-btn--yellow ds-btn--sm" onClick={() => setComparing(true)}>Compare</button>
        </div>
      )}
      <p className={styles.goNote} role="status">{saveNote ? `${saveNote} ` : ""}Times are walking estimates and don&apos;t include buses.</p>
      {comparing && pair.length === 2 && (
        <Modal role="dialog" aria-modal="true" aria-labelledby="hf-compare-title" onKeyDown={(e) => e.key === "Escape" && setComparing(false)}>
          <div className={styles.dialog}>
            <div className={styles.dialogTop}>
              <button type="button" className={styles.x} aria-label="Close" onClick={() => setComparing(false)}><CloseIcon /></button>
            </div>
            <h2 id="hf-compare-title" className={styles.dialogTitle}>
              {halls.get(pair[0].dormId)?.name} <span className="ds-serif ds-serif--blue">vs</span> {halls.get(pair[1].dormId)?.name}
            </h2>
            <table className={styles.compareTable}>
              <thead>
                <tr><th scope="col">Place</th><th scope="col">{halls.get(pair[0].dormId)?.name}</th><th scope="col">{halls.get(pair[1].dormId)?.name}</th></tr>
              </thead>
              <tbody>
                {places.map((p, j) => (
                  <tr key={p.n}><td>{p.name}</td><td>{minutesText(pair[0].perPlace[j])}</td><td>{minutesText(pair[1].perPlace[j])}</td></tr>
                ))}
              </tbody>
              <tfoot>
                <tr><td>A week</td><td>{formatMinutes(pair[0].weekly)}</td><td>{formatMinutes(pair[1].weekly)}</td></tr>
                <tr><td>AC</td><td>{facts[pair[0].dormId]?.ac ? "Yes" : "No"}</td><td>{facts[pair[1].dormId]?.ac ? "Yes" : "No"}</td></tr>
              </tfoot>
            </table>
          </div>
        </Modal>
      )}
    </>
  );
}
