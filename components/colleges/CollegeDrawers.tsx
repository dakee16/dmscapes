"use client";

import { useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@/components/ds/Icons";
import css from "./Colleges.module.css";

export type Campus = {
  id: string;
  name: string;
  sort: string;
  city: string | null;
  state: string | null;
  buildings: number;
  rooms: number;
};

const DRAWERS: { label: string; from: string; to: string }[] = [
  { label: "A–B", from: "a", to: "b" },
  { label: "C", from: "c", to: "c" },
  { label: "D–G", from: "d", to: "g" },
  { label: "H–L", from: "h", to: "l" },
  { label: "M", from: "m", to: "m" },
  { label: "N–O", from: "n", to: "o" },
  { label: "P–R", from: "p", to: "r" },
  { label: "S–T", from: "s", to: "t" },
  { label: "U–Z", from: "u", to: "z" },
];

const TAB_TONES = ["blue", "yellow", "white"] as const;

function place(c: Campus) {
  return [c.city, c.state].filter(Boolean).join(", ");
}

function IndexCard({ c, i }: { c: Campus; i: number }) {
  return (
    <li className={css.cardItem}>
      <Link href={`/colleges/${c.id}`} className={css.indexCard}>
        <span className={css.cardTab} data-tone={TAB_TONES[i % 3]} aria-hidden="true">
          {c.sort[0].toUpperCase()}
        </span>
        <span className={css.cardName}>{c.name}</span>
        <span className={css.cardPlace}>{place(c)}</span>
        <span className={css.cardMeta}>
          <span>
            {c.buildings} building{c.buildings === 1 ? "" : "s"} · {c.rooms} room type{c.rooms === 1 ? "" : "s"}
          </span>
          <span className={css.cardOpen} aria-hidden="true">
            Open →
          </span>
        </span>
      </Link>
    </li>
  );
}

function ListRow({ c }: { c: Campus }) {
  return (
    <li>
      <Link href={`/colleges/${c.id}`} className={css.listRow}>
        <span className={css.listName}>{c.name}</span>
        <span className={css.listPlace}>{place(c)}</span>
        <span className={css.listMeta}>
          {c.buildings} bldg · {c.rooms} rooms
        </span>
        <ArrowRight size={16} />
      </Link>
    </li>
  );
}

/**
 * The directory as a card catalog: nine drawers A to Z, each holding index
 * cards. Every school is in the HTML (inactive drawers are `hidden`), so all
 * 103 links stay crawlable. Typing in the filter searches across drawers.
 */
export default function CollegeDrawers({ schools }: { schools: Campus[] }) {
  const [drawer, setDrawer] = useState(0);
  const [view, setView] = useState<"cards" | "list">("cards");
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();

  const groups = useMemo(
    () =>
      DRAWERS.map((d) =>
        schools.filter((s) => {
          const ch = s.sort[0];
          return ch >= d.from && ch <= d.to;
        })
      ),
    [schools]
  );

  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = terms.length
    ? schools.filter((s) => terms.every((t) => `${s.name} ${s.city ?? ""} ${s.state ?? ""}`.toLowerCase().includes(t)))
    : null;

  function onTabKey(e: React.KeyboardEvent, i: number) {
    let n = i;
    if (e.key === "ArrowRight") n = (i + 1) % DRAWERS.length;
    else if (e.key === "ArrowLeft") n = (i - 1 + DRAWERS.length) % DRAWERS.length;
    else if (e.key === "Home") n = 0;
    else if (e.key === "End") n = DRAWERS.length - 1;
    else return;
    e.preventDefault();
    setDrawer(n);
    tabRefs.current[n]?.focus();
  }

  const render = (list: Campus[]) =>
    view === "cards" ? (
      <ul className={css.cards}>
        {list.map((c, i) => (
          <IndexCard key={c.id} c={c} i={i} />
        ))}
      </ul>
    ) : (
      <ul className={css.list}>
        {list.map((c) => (
          <ListRow key={c.id} c={c} />
        ))}
      </ul>
    );

  return (
    <div className={css.directory}>
      <div className={css.dirTools}>
        <div className={css.filter}>
          <label htmlFor={`${uid}-q`} className="ds-sr">
            Filter schools by name, city or state
          </label>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={input}
            id={`${uid}-q`}
            type="search"
            value={query}
            placeholder="Filter by school, city or state"
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div className={css.toggle} role="group" aria-label="View">
          <button type="button" aria-pressed={view === "cards"} onClick={() => setView("cards")}>
            Cards
          </button>
          <button type="button" aria-pressed={view === "list"} onClick={() => setView("list")}>
            List
          </button>
        </div>
      </div>

      {results ? (
        <div className={css.tray} data-mode="results">
          <p className={css.trayNote} role="status">
            {results.length} of {schools.length} schools match “{query.trim()}”
          </p>
          {results.length ? (
            render(results)
          ) : (
            <p className={css.empty}>
              No schools found. Try a shorter name, a city or a state, or{" "}
              <Link href="/add-school" className="ds-link">
                request your school
              </Link>
              .
            </p>
          )}
        </div>
      ) : (
        <>
          <div className={css.tabs} role="tablist" aria-label="Drawers, A to Z">
            {DRAWERS.map((d, i) => (
              <button
                key={d.label}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${uid}-tab-${i}`}
                aria-controls={`${uid}-panel-${i}`}
                aria-selected={drawer === i}
                tabIndex={drawer === i ? 0 : -1}
                className={css.tab}
                onClick={() => setDrawer(i)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                <span>{d.label}</span>
                <small>{groups[i].length}</small>
              </button>
            ))}
          </div>
          {DRAWERS.map((d, i) => (
            <div
              key={d.label}
              role="tabpanel"
              id={`${uid}-panel-${i}`}
              aria-labelledby={`${uid}-tab-${i}`}
              hidden={drawer !== i}
              className={css.tray}
            >
              {render(groups[i])}
              <div className={css.trayFoot}>
                <span>
                  {groups[i].length} school{groups[i].length === 1 ? "" : "s"} in {d.label.replace("–", " – ")}
                </span>
                {i < DRAWERS.length - 1 && (
                  <button type="button" className={css.next} onClick={() => setDrawer(i + 1)}>
                    Next drawer: {DRAWERS[i + 1].label} <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
