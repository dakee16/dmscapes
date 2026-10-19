"use client";

// "We found 4 classes. Check them." (design Confirm / ConfirmPhone). Every class shows the
// text read from the file and the building it matched; an unsure match asks "Did you mean
// …?" and an unmatched one opens search. Nothing is added until it's confirmed here.
import { useMemo, useState } from "react";
import Modal from "@/components/site/Modal";
import { ArrowRight, Check, CloseIcon } from "@/components/ds/Icons";
import { DAYS, type CampusPlace } from "@/lib/hall-finder";
import { matchBuilding, type IcsClass } from "@/lib/ics";
import { searchPlaces } from "./search";
import styles from "./HallFinder.module.css";

interface Row {
  cls: IcsClass;
  placeId: string | null;
  confirmed: boolean;
  searching: boolean;
}

const dayText = (mask: number) => DAYS.filter((_, i) => mask & (1 << i)).join(" ");

export default function ConfirmIcs({
  fileName,
  classes,
  places,
  onAdd,
  onReplace,
  onClose,
}: {
  fileName: string;
  classes: IcsClass[];
  places: CampusPlace[];
  onAdd: (rows: { placeId: string; days: number; label: string }[]) => void;
  onReplace: () => void;
  onClose: () => void;
}) {
  const byId = useMemo(() => new Map(places.map((p) => [p.id, p])), [places]);
  const [rows, setRows] = useState<Row[]>(() =>
    classes.map((cls) => {
      const m = matchBuilding(cls.location, places);
      return { cls, placeId: m?.place.id ?? null, confirmed: Boolean(m?.sure), searching: !m };
    }),
  );
  const [queries, setQueries] = useState<Record<number, string>>({});
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const ready = rows.filter((r) => r.placeId && r.confirmed);

  return (
    <Modal role="dialog" aria-modal="true" aria-labelledby="hf-confirm-title" onKeyDown={(e) => e.key === "Escape" && onClose()}>
      <div className={styles.dialog}>
        <div className={styles.dialogTop}>
          <span className={styles.fileTag}>{fileName}</span>
          <span>Read in your browser. The file isn&apos;t uploaded.</span>
          <button type="button" className={styles.x} aria-label="Close" onClick={onClose}>
            <CloseIcon />
          </button>
        </div>
        <h2 id="hf-confirm-title" className={styles.dialogTitle}>
          We found {classes.length} {classes.length === 1 ? "class" : "classes"}. <span className="ds-serif ds-serif--blue">Check them.</span>
        </h2>
        <ol className={styles.classes}>
          {rows.map((r, i) => {
            const place = r.placeId ? byId.get(r.placeId) : null;
            const q = queries[i] ?? "";
            const hits = r.searching && q.trim() ? searchPlaces(places, q).slice(0, 6) : [];
            return (
              <li key={`${r.cls.course}-${i}`} className={styles.cls}>
                <div className={styles.clsTop}>
                  <span className={styles.clsName}>
                    {r.cls.course}
                    <span>{[dayText(r.cls.days), r.cls.time].filter(Boolean).join(" · ")}</span>
                  </span>
                  <span className={styles.read}>“{r.cls.location}”</span>
                  {place && r.confirmed && (
                    <span className={styles.matched}>
                      <Check /> {place.name}
                    </span>
                  )}
                </div>
                {place && !r.confirmed && !r.searching && (
                  <div className={styles.unsure} role="group" aria-label={`Check the building for ${r.cls.course}`}>
                    <p>
                      <strong>Did you mean {place.name}?</strong> We weren&apos;t sure about this one.
                    </p>
                    <button type="button" className="ds-btn ds-btn--ink-yellow ds-btn--sm" onClick={() => set(i, { confirmed: true })}>
                      Yes, {place.short || place.name}
                    </button>
                    <button type="button" className="ds-btn ds-btn--ghost-ink ds-btn--sm" onClick={() => set(i, { searching: true, placeId: null })}>
                      Pick another
                    </button>
                  </div>
                )}
                {r.searching && (
                  <div className={styles.search}>
                    <label className={styles.label} htmlFor={`hf-pick-${i}`}>
                      We couldn&apos;t place this one. Find the building, or leave it out:
                    </label>
                    <div className={styles.searchBox}>
                      <input id={`hf-pick-${i}`} value={q} autoComplete="off" placeholder="Building name or code" onChange={(e) => setQueries((s) => ({ ...s, [i]: e.target.value }))} />
                    </div>
                    {hits.length > 0 && (
                      <div className={styles.chips}>
                        {hits.map((p) => (
                          <button key={p.id} type="button" className={styles.chip} onClick={() => set(i, { placeId: p.id, confirmed: true, searching: false })}>
                            {p.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
        <p className={styles.dialogNote}>You can fix days and add a dining hall or gym on the next screen.</p>
        <div className={styles.dialogActions}>
          <button
            type="button"
            className="ds-btn ds-btn--ink-yellow"
            disabled={!ready.length}
            onClick={() => onAdd(ready.map((r) => ({ placeId: r.placeId!, days: r.cls.days, label: r.cls.course })))}
          >
            Add {ready.length} {ready.length === 1 ? "class" : "classes"} <ArrowRight />
          </button>
          <button type="button" className="ds-btn ds-btn--ghost-ink" onClick={onReplace}>
            Upload a different file
          </button>
        </div>
      </div>
    </Modal>
  );
}
