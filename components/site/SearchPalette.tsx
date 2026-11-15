"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CloseIcon, SearchIcon } from "@/components/ds/Icons";
import { track } from "@/lib/analytics";
import s from "./SearchPalette.module.css";
import { POPULAR_SCHOOLS } from "@/lib/popular-schools";

/** One school from /search-index.json: [id, name, "City, ST", aliases, [[hallId, hallName], …]]. */
type Row = [id: string, name: string, place: string, aliases: string, halls: [string, string][]];
/** One page or feature (lib/search-catalog): [title, detail, href, words, Hall Finder only]. */
type PageRow = [title: string, detail: string, href: string, words: string, hallFinder: 0 | 1];
type Index = { schools: Row[]; pages: PageRow[] };
type Hit = { kind: "school" | "hall" | "page"; title: string; detail: string; href: string };

/** Shown before you type: the main features, then the planner's featured campuses (components/plan-steps/SchoolStep). */
const START = ["/plan", "/hall-finder", "/my-room", "/dorm-room-size", "/pricing"];
const POPULAR = POPULAR_SCHOOLS.map((s) => s.id);

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const words = (t: string) => norm(t).split(" ").filter(Boolean);
const short = (name: string) => name.replace(/^The\s+/, "").replace(/\s*\(.*\)$/, "");

let index: Promise<Index> | null = null;
function load(): Promise<Index> {
  index ??= fetch("/search-index.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: Partial<Index>) => ({ schools: d.schools ?? [], pages: d.pages ?? [] }))
    .catch(() => { index = null; return { schools: [], pages: [] }; });
  return index;
}

// Words a question is made of rather than about ("how do I plan with my roommates").
const FILLER = new Set("a an the to for of in on at my me i is it its how do does can what where which with and or your you page go open find show want need get".split(" "));
// Words that ask for Hall Finder: "penn state closest dorm" also offers Penn State's Hall Finder.
const FINDER = new Set(["finder", "rank", "ranked", "ranking", "closest", "nearest", "walk", "walking", "schedule", "commute", "class", "classes"]);
const GENERIC = new Set(["dorm", "dorms", "room", "rooms", "hall", "halls", "residence", "housing", "building", "buildings"]);
// "planning" ~ "plan", "roommates" ~ "roommate": word endings don't matter.
const stem = (w: string) => (w.length > 4 ? w.replace(/(ings?|ers?|ed|es|s)$/, "") : w);
/** One typo apart: a letter added, missing, changed or two swapped ("roomate"). */
function near(a: string, b: string): boolean {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1) || (a[i] === b[i + 1] && a[i + 1] === b[i] && a.slice(i + 2) === b.slice(i + 2));
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1);
}
/** How well one query word fits one word of the text: 0 (it starts the text) to 4 (a typo); null if not at all. */
function fit(token: string, word: string, first: boolean): number | null {
  if (word.startsWith(token)) return first ? 0 : 1;
  const t = stem(token), w = stem(word);
  if (w.startsWith(t) || (w.length >= 3 && t.startsWith(w))) return 2;
  if (token.length >= 3 && word.includes(token)) return 3;
  if (token.length >= 5 && (near(token, word) || near(token, word.slice(0, token.length)))) return 4;
  return null;
}
/** How well a text holds every query word: lower is better; null if one is missing. */
function score(text: string[], tokens: string[]): number | null {
  let total = 0;
  for (const t of tokens) {
    let best: number | null = null;
    for (let i = 0; i < text.length && best !== 0; i++) {
      const s = fit(t, text[i], i === 0);
      if (s !== null && (best === null || s < best)) best = s;
    }
    if (best === null) return null;
    total += best;
  }
  return total;
}

/**
 * Site-wide search: pages and features (by title, then by the words people use for them), schools,
 * residence halls, and a school's Hall Finder when the query asks for it. Each group keeps its best
 * matches; the groups are ordered by their best match, so "roommate planning" leads with pages and
 * "penn state" with schools.
 */
function search({ schools: rows, pages: all }: Index, query: string, hallFinder: boolean): { label: string; hits: Hit[] }[] {
  const typed = words(query);
  const meaningful = typed.filter((t) => !FILLER.has(t));
  const tokens = meaningful.length ? meaningful : typed;
  const pages = all.filter((p) => hallFinder || !p[4]);
  const school = ([id, name, place, , halls]: Row): Hit => ({ kind: "school", title: short(name), detail: `${place} · ${halls.length} ${halls.length === 1 ? "hall" : "halls"}`, href: `/colleges/${id}` });
  const page = ([title, detail, href]: PageRow): Hit => ({ kind: "page", title, detail, href });
  if (!tokens.length) {
    const popular = POPULAR.map((id) => rows.find((r) => r[0] === id)).filter((r): r is Row => !!r);
    const start = START.map((href) => pages.find((p) => p[2] === href)).filter((p): p is PageRow => !!p);
    return [{ label: "Go to", hits: start.map(page) }, { label: "Popular schools", hits: popular.map(school) }];
  }
  type Scored = { item: Hit; score: number; size: number };
  const ranked = (items: Scored[], limit: number) => items.sort((a, b) => a.score - b.score || a.size - b.size).slice(0, limit);
  const schoolHits: Scored[] = [];
  const hallHits: Scored[] = [];
  const pageHits: Scored[] = [];
  for (const p of pages) {
    const byTitle = score(words(p[0]), tokens);
    const byWords = score(words(`${p[0]} ${p[1]} ${p[3]}`), tokens);
    const sc = byTitle ?? (byWords === null ? null : byWords + 1);
    if (sc !== null) pageHits.push({ item: page(p), score: sc, size: p[0].length });
  }
  // The rest of a Hall Finder query names the school ("closest dorm at ucla": ucla), so generic words drop out.
  const finder = hallFinder && tokens.some((t) => FINDER.has(t)) ? tokens.filter((t) => !FINDER.has(t) && !GENERIC.has(t)) : null;
  for (const row of rows) {
    const [id, name, place, aliases, list] = row;
    const where = words(`${short(name)} ${aliases} ${name} ${place}`);
    const sc = score(where, tokens);
    if (sc !== null) schoolHits.push({ item: school(row), score: sc, size: name.length });
    // "penn state hall finder", "closest dorm at ucla": that school's Hall Finder.
    const fsc = finder?.length ? score(where, finder) : null;
    if (fsc !== null) pageHits.push({ item: { kind: "page", title: `${short(name)} Hall Finder`, detail: "Rank its halls by your walk to class", href: `/colleges/${id}/hall-finder` }, score: fsc, size: name.length });
    for (const [hallId, hall] of list) {
      // A hall matches on its own name, or on its name plus its school ("penn state geary").
      const own = score(words(hall), tokens), both = own ?? score([...words(hall), ...where], tokens);
      if (both !== null) hallHits.push({ item: { kind: "hall", title: hall, detail: short(name), href: `/colleges/${id}/${hallId}` }, score: own ?? both + 4, size: hall.length });
    }
  }
  return [
    { label: "Pages and features", hits: ranked(pageHits, 6) },
    { label: "Schools", hits: ranked(schoolHits, 5) },
    { label: "Residence halls", hits: ranked(hallHits, 6) },
  ]
    .filter((g) => g.hits.length)
    .sort((a, b) => a.hits[0].score - b.hits[0].score)
    .map((g) => ({ label: g.label, hits: g.hits.map((x) => x.item) }));
}

/**
 * Search from any page (Kokonut Command Palette): a header button, ⌘K / Ctrl+K, or "/" opens a panel that
 * finds any page or feature, any school and any residence hall. A combobox: arrows move, Enter opens,
 * Escape closes and focus returns to the button. Full screen on phones.
 */
export default function SearchPalette({ hallFinder }: { hallFinder: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Index | null>(null);
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();

  const groups = useMemo(() => (rows ? search(rows, query, hallFinder) : []), [rows, query, hallFinder]);
  const hits = useMemo(() => groups.flatMap((g) => g.hits), [groups]);

  const show = useCallback((via: string) => {
    setOpen(true);
    track("site_search_opened", { via });
    load().then(setRows);
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
    requestAnimationFrame(() => trigger.current?.focus());
  }, []);
  function go(hit: Hit) {
    track("site_search_result", { kind: hit.kind, href: hit.href });
    setOpen(false);
    setQuery("");
    router.push(hit.href);
  }

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => setActive(0), [query]);
  // ⌘K / Ctrl+K anywhere; "/" when not typing and the page hasn't claimed it (the planner's own search does).
  useEffect(() => {
    function onKey(e: globalThis.KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) hide(); else show("shortcut");
        return;
      }
      if (e.key !== "/" || open || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      show("slash");
    }
    // The phone menu's "Search dormscape" row (Nav) opens it too.
    const fromMenu = () => show("menu");
    window.addEventListener("keydown", onKey);
    window.addEventListener("dormscape:search", fromMenu);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("dormscape:search", fromMenu);
    };
  }, [open, show, hide]);
  useEffect(() => {
    if (!open) return;
    const root = document.documentElement, before = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = before; };
  }, [open]);
  useEffect(() => {
    document.getElementById(`${listId}-${active}`)?.scrollIntoView({ block: "nearest" });
  }, [active, listId]);

  function keys(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (hits.length) setActive((a) => (a + (e.key === "ArrowDown" ? 1 : -1) + hits.length) % hits.length);
    } else if (e.key === "Enter" && hits[active]) {
      e.preventDefault();
      go(hits[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      hide();
    }
  }
  // Keep Tab inside the panel (the field and the close button).
  function trap(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Escape") { e.preventDefault(); hide(); return; }
    if (e.key !== "Tab") return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("input, button, a[href]"));
    const first = items[0], last = items.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  }

  let n = -1;
  const panel = (
    <AnimatePresence>
      {open && (
        <motion.div key="search" className={s.backdrop} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }} onPointerDown={(e) => { if (e.target === e.currentTarget) hide(); }}>
          <motion.div role="dialog" aria-modal="true" aria-label="Search dormscape" className={`ds ${s.panel}`} onKeyDown={trap}
            initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 520, damping: 40 }}>
            <div className={s.field}>
              <SearchIcon size={20} className={s.fieldIcon} />
              <input autoFocus role="combobox" aria-expanded={hits.length > 0} aria-controls={listId} aria-autocomplete="list"
                aria-activedescendant={hits[active] ? `${listId}-${active}` : undefined} aria-label="Search pages, features, schools and halls"
                placeholder="Search pages, features, schools and halls" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={keys}
                spellCheck={false} autoComplete="off" autoCapitalize="off" enterKeyHint="go" />
              <button type="button" className={s.close} onClick={hide} aria-label="Close search">
                <span className={s.esc} aria-hidden="true">Esc</span>
                <span className={s.x}><CloseIcon size={18} /></span>
              </button>
            </div>
            <div className={s.results}>
              {rows === null ? (
                <p className={s.status} role="status">Loading…</p>
              ) : !hits.length ? (
                <p className={s.status} role="status">
                  Nothing matches “{query.trim()}”. Try a feature like “roommates”, a school or a hall. School not listed? <Link href="/add-school" className="ds-link" onClick={() => setOpen(false)}>Add your school</Link>
                </p>
              ) : (
                <div id={listId} role="listbox" aria-label="Results">
                  {groups.map((g) => (
                    <div key={g.label} role="group" aria-label={g.label} className={s.group}>
                      <p className={s.groupLabel} aria-hidden="true">{g.label}</p>
                      {g.hits.map((hit) => {
                        const i = ++n;
                        return (
                          <div key={hit.href} id={`${listId}-${i}`} role="option" aria-selected={i === active} className={s.option}
                            data-kind={hit.kind} onPointerMove={() => setActive(i)} onClick={() => go(hit)}>
                            <span className={s.kind} aria-hidden="true">{hit.kind === "hall" ? "Hall" : hit.kind === "school" ? "School" : "Page"}</span>
                            <span className={s.text}>
                              <span className={s.title}>{hit.title}</span>
                              <span className={s.detail}>{hit.detail}</span>
                            </span>
                            <span className={s.arrow} aria-hidden="true"><ArrowUpRight size={14} strokeWidth={2.6} /></span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <p className={s.foot} aria-hidden="true"><kbd>↑</kbd><kbd>↓</kbd> move <kbd>Enter</kbd> open <kbd>Esc</kbd> close</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button ref={trigger} type="button" className={s.trigger} onClick={() => show("button")} onPointerEnter={() => void load()}
        onFocus={() => void load()} aria-haspopup="dialog" aria-label="Search dormscape" aria-keyshortcuts="Meta+K Control+K /"
        title="Search dormscape (⌘K)">
        <SearchIcon size={18} />
      </button>
      {mounted && createPortal(panel, document.body)}
    </>
  );
}
