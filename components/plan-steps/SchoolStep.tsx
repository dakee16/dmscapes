"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SCHOOLS, getSchool, searchSchools } from "@/lib/schools";
import { shortName, sortKey } from "@/lib/school-names";
import { ArrowRight, ArrowUpRight, CloseIcon, SearchIcon } from "@/components/ds/Icons";
import ManualEntry, { type ManualEntryValues } from "@/components/planner/ManualEntry";
import { PencilIcon, PlusIcon } from "./icons";
import { plural, schoolCounts } from "./room-model";
import type { SchoolSummary } from "@/lib/types";
import css from "./School.module.css";

/** The big campuses, as people say them. Only chips whose school exists in the data render. */
const FEATURED: { id: string; label: string }[] = [
  { id: "penn-state", label: "Penn State" },
  { id: "university-of-michigan", label: "Michigan" },
  { id: "ohio-state", label: "Ohio State" },
  { id: "nyu", label: "NYU" },
  { id: "rutgers", label: "Rutgers" },
  { id: "ut-austin", label: "UT Austin" },
  { id: "purdue", label: "Purdue" },
];

const SORTED = [...SCHOOLS].sort((a, b) => sortKey(a.name).localeCompare(sortKey(b.name)));
const HALLS = SCHOOLS.reduce((n, s) => n + s.dorms.length, 0);
const letterOf = (s: SchoolSummary) => sortKey(s.name).charAt(0).toUpperCase();

/** Wrap the typed text in a <mark> wherever it appears in a label. */
function highlight(text: string, q: string) {
  const query = q.trim();
  if (!query) return text;
  const i = text.toLowerCase().indexOf(query.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <mark className={css.mark}>{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
}

/**
 * Step 01, first half: find your campus. The search filters the numbered A to
 * Z list as you type (it is the list's combobox), the / key jumps to it, and
 * the featured chips go straight to the big campuses.
 */
export default function SchoolStep({
  onSelect,
  onRequest,
  onManual,
  resume,
}: {
  onSelect: (school: SchoolSummary) => void;
  onRequest: () => void;
  onManual: (values: ManualEntryValues) => void;
  /** The room already chosen, if any (a return visit, typed or drawn room). */
  resume?: React.ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [browse, setBrowse] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  // On desktop the list is always on screen; on phones it opens with a query.
  const [wide, setWide] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const uid = useId();

  const q = query.trim();
  const results = useMemo(() => (q ? searchSchools(q) : SORTED), [q]);
  // The list shows on phones once there is a query or the visitor asks to browse.
  const listOpen = Boolean(q) || browse;

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setWide(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // "/" focuses the search from anywhere on the page (not while typing elsewhere).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Keep the keyboard-active row in view: scroll the panel, not the page
  // (hovering a row never scrolls anything).
  const keyNav = useRef(false);
  function reveal(i: number, align: "nearest" | "start") {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${i}"]`);
    const body = listRef.current?.parentElement;
    if (!el || !body) return;
    if (body.scrollHeight <= body.clientHeight + 1) {
      el.scrollIntoView({ block: "nearest" });
      return;
    }
    const b = body.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    if (align === "start") body.scrollTop += r.top - b.top - 4;
    else if (r.top < b.top) body.scrollTop -= b.top - r.top + 8;
    else if (r.bottom > b.bottom - 40) body.scrollTop += r.bottom - b.bottom + 48;
  }
  useEffect(() => {
    if (!keyNav.current) return;
    keyNav.current = false;
    reveal(active, "nearest");
  }, [active]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      keyNav.current = true;
      setBrowse(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      keyNav.current = true;
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[active]) onSelect(results[active]);
      else if (q) onRequest();
    } else if (e.key === "Escape" && query) {
      e.preventDefault();
      setQuery("");
      setActive(0);
    }
  }

  function jump(letter: string) {
    if (q) setQuery("");
    const i = SORTED.findIndex((s) => letterOf(s) === letter);
    if (i < 0) return;
    setActive(i);
    requestAnimationFrame(() => reveal(i, "start"));
  }

  const letters = useMemo(() => [...new Set(SORTED.map(letterOf))], []);
  const activeLetter = results[active] ? letterOf(results[active]) : null;
  const featured = FEATURED.filter((f) => getSchool(f.id));
  const listId = `${uid}-schools`;
  const optionId = (i: number) => `${uid}-school-${i}`;

  return (
    <div className={css.layout}>
      <div className={css.left}>
        <p className={`ds-eyebrow ${css.eyebrow}`}>Step 01 · Room</p>
        <h1 className={css.title}>
          <span className={css.titleSans}>Find your</span>
          <span className={css.titleSerif}>campus.</span>
        </h1>
        <p className={css.lede}>
          {`${SCHOOLS.length.toLocaleString("en-US")} schools and ${HALLS.toLocaleString("en-US")} residence halls. `}
          Pick yours and we load your building&apos;s real dimensions.
        </p>

        <form role="search" className={css.searchForm} onSubmit={(e) => e.preventDefault()}>
          <label htmlFor="plan-school-search" className="ds-sr">
            Search schools
          </label>
          <div className={css.search}>
            <SearchIcon size={24} className={css.searchIcon} />
            <input
              ref={inputRef}
              id="plan-school-search"
              type="text"
              role="combobox"
              aria-expanded={wide || listOpen}
              aria-controls={listId}
              aria-autocomplete="list"
              aria-activedescendant={results[active] ? optionId(active) : undefined}
              aria-describedby={`${uid}-hint`}
              autoComplete="off"
              spellCheck={false}
              placeholder={`Search ${SCHOOLS.length} schools`}
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className={css.input}
            />
            {query ? (
              <button
                type="button"
                className={css.clear}
                aria-label="Clear search"
                onClick={() => {
                  setQuery("");
                  setActive(0);
                  inputRef.current?.focus();
                }}
              >
                <CloseIcon size={18} />
              </button>
            ) : (
              <kbd className={css.kbd} aria-hidden="true">
                /
              </kbd>
            )}
          </div>
          <span id={`${uid}-hint`} className="ds-sr">
            Type to filter the list. Use the arrow keys to move and Enter to choose. Press slash to come back to this
            search.
          </span>
        </form>

        {resume && <div className={css.resume}>{resume}</div>}

        {featured.length > 0 && (
          <div className={css.featured}>
            <span className={css.smallLabel}>Featured</span>
            {featured.map((f) => (
              <button
                key={f.id}
                type="button"
                className={css.chip}
                onClick={() => {
                  const s = getSchool(f.id);
                  if (s) onSelect(s);
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}

        {/* Phones: the matches sit right under the search. */}
        <p className={`${css.smallLabel} ${css.matchCount}`} aria-live="polite">
          {q ? plural(results.length, "match", "matches") : ""}
        </p>
        {!q && !browse && (
          <button type="button" className={css.browse} onClick={() => setBrowse(true)} aria-controls={listId}>
            Browse all {SCHOOLS.length} schools, A to Z
            <ArrowRight size={18} />
          </button>
        )}

        <div className={css.notListed}>
          <p className={css.smallLabel}>Not on the list?</p>
          <div className={css.options}>
            <Link href="/plan/draw" className={css.option}>
              <span className={css.optionHead}>
                <PencilIcon className={css.optionIcon} />
                Draw your room in 2D
                <ArrowRight size={18} className={css.optionArrow} />
              </span>
              <span className={css.optionBody}>Trace your floor plan, then add doors, windows and closets.</span>
            </Link>
            <button type="button" className={css.option} onClick={onRequest}>
              <span className={css.optionHead}>
                <PlusIcon className={css.optionIcon} />
                Request your school
                <ArrowRight size={18} className={css.optionArrow} />
              </span>
              <span className={css.optionBody}>Tell us where you&apos;re headed and we&apos;ll add it.</span>
            </button>
          </div>
          <button
            type="button"
            className={css.manualToggle}
            aria-expanded={manualOpen}
            aria-controls={`${uid}-manual`}
            onClick={() => setManualOpen((v) => !v)}
          >
            Can&rsquo;t find your room? Add your own
          </button>
          <div id={`${uid}-manual`} hidden={!manualOpen} className={css.manual}>
            {manualOpen && (
              <>
                <ManualEntry mode="school" onSubmit={onManual} />
                <p className={css.manualNote}>
                  Need a different shape? <Link href="/plan/draw">Draw your room</Link> with Plus, or{" "}
                  <Link href="/plan/draw/3d">build in 3D</Link> with Pro.
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <section className={css.panel} aria-label="All schools" data-open={listOpen}>
        <div className={css.panelHead}>
          <span className={css.panelCount}>
            {results.length} of {SCHOOLS.length} schools
          </span>
          <span className={css.panelSort}>A–Z</span>
        </div>
        <div className={css.panelBody}>
          {results.length === 0 ? (
            <p className={css.empty}>
              No matches yet.{" "}
              <button type="button" className={css.inlineLink} onClick={onRequest}>
                Add my school
              </button>{" "}
              and we&apos;ll measure it.
            </p>
          ) : null}
          <ul ref={listRef} id={listId} role="listbox" aria-label="Schools" className={css.list}>
            {results.map((s, i) => {
              const { buildings, roomTypes } = schoolCounts(s);
              const title = shortName(s);
              const place = [s.city, s.state].filter(Boolean).join(", ");
              const sub = title !== s.name.replace(/^The /, "") ? s.name : place;
              const on = i === active;
              return (
                <li
                  key={s.id}
                  id={optionId(i)}
                  role="option"
                  aria-selected={on}
                  data-index={i}
                  className={css.row}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => onSelect(s)}
                >
                  <span className={css.rowNum}>{String(i + 1).padStart(2, "0")}</span>
                  <span className={css.rowName}>
                    <span className={css.rowTitle}>{highlight(title, q)}</span>
                    <span className={css.rowSub}>{sub}</span>
                  </span>
                  <span className={css.rowCounts}>
                    {plural(buildings, "building")} · {plural(roomTypes, "room type")}
                  </span>
                  <span className={css.rowGo} aria-hidden="true">
                    <ArrowUpRight size={18} className={css.goDesk} />
                    <ArrowRight size={18} className={css.goPhone} />
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        {!q && (
          <div className={css.rail} aria-hidden="true">
            {letters.map((l) => (
              <button key={l} type="button" tabIndex={-1} data-on={l === activeLetter} onClick={() => jump(l)}>
                {l}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
