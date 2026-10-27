"use client";

import { useCallback, useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, CloseIcon, SearchIcon } from "@/components/ds/Icons";
import { track } from "@/lib/analytics";
import s from "./SearchPalette.module.css";

/** One school from /search-index.json: [id, name, "City, ST", aliases, [[hallId, hallName], …]]. */
type Row = [id: string, name: string, place: string, aliases: string, halls: [string, string][]];
type Hit = { kind: "school" | "hall" | "page"; title: string; detail: string; href: string };

const PAGES: { title: string; detail: string; href: string; words: string; hallFinder?: boolean }[] = [
  { title: "Plan my room", detail: "A layout and shopping list, together", href: "/plan", words: "plan planner start layout design" },
  { title: "Hall Finder", detail: "Rank halls by your class schedule", href: "/hall-finder", words: "hall finder walk walking class classes schedule closest", hallFinder: true },
  { title: "Colleges A to Z", detail: "Every supported school", href: "/colleges", words: "colleges schools universities list all" },
  { title: "How big is a dorm room?", detail: "Typical sizes, drawn to scale", href: "/dorm-room-size", words: "size sizes dimensions square feet sq ft how big average typical" },
  { title: "Pricing", detail: "Free to plan, pay once to go further", href: "/pricing", words: "pricing price cost plus pro credits buy upgrade" },
  { title: "Frequently asked", detail: "Short answers about planning a room", href: "/faq", words: "faq questions help answers" },
  { title: "Room guides", detail: "The dormscape blog", href: "/blog", words: "blog guides articles tips" },
  { title: "My Room", detail: "The room you share with your roommates", href: "/my-room", words: "my room roommates shared workspace together" },
  { title: "Build in 3D", detail: "Walls, doors and windows with Pro", href: "/plan/draw/3d", words: "3d builder build draw" },
  { title: "Add your school", detail: "Tell us where you're headed", href: "/add-school", words: "add school missing request not listed" },
];
/** Shown before you type: the planner's featured campuses (components/plan-steps/SchoolStep). */
const POPULAR = ["penn-state", "university-of-michigan", "ohio-state", "nyu", "rutgers", "ut-austin", "purdue"];

const norm = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const short = (name: string) => name.replace(/^The\s+/, "").replace(/\s*\(.*\)$/, "");

let index: Promise<Row[]> | null = null;
function load(): Promise<Row[]> {
  index ??= fetch("/search-index.json")
    .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
    .then((d: { schools: Row[] }) => d.schools)
    .catch(() => { index = null; return []; });
  return index;
}

/** How well `text` holds every token: lower is better (a token starting the text or a word scores best); null if one is missing. */
function score(text: string, tokens: string[]): number | null {
  let total = 0;
  for (const t of tokens) {
    const at = text.indexOf(t);
    if (at < 0) return null;
    total += at === 0 ? 0 : text[at - 1] === " " ? 1 : 3;
  }
  return total;
}

function search(rows: Row[], query: string, hallFinder: boolean): { label: string; hits: Hit[] }[] {
  const tokens = norm(query).split(" ").filter(Boolean);
  const pages = PAGES.filter((p) => hallFinder || !p.hallFinder);
  const school = ([id, name, place, , halls]: Row): Hit => ({ kind: "school", title: short(name), detail: `${place} · ${halls.length} ${halls.length === 1 ? "hall" : "halls"}`, href: `/colleges/${id}` });
  const page = (p: (typeof PAGES)[number]): Hit => ({ kind: "page", title: p.title, detail: p.detail, href: p.href });
  if (!tokens.length) {
    const popular = POPULAR.map((id) => rows.find((r) => r[0] === id)).filter((r): r is Row => !!r);
    return [{ label: "Popular schools", hits: popular.map(school) }, { label: "Pages", hits: pages.slice(0, 5).map(page) }];
  }
  const ranked = <T,>(items: { item: T; score: number; size: number }[], limit: number) =>
    items.sort((a, b) => a.score - b.score || a.size - b.size).slice(0, limit).map((x) => x.item);
  const schools: { item: Hit; score: number; size: number }[] = [];
  const halls: { item: Hit; score: number; size: number }[] = [];
  for (const row of rows) {
    const [id, name, place, aliases, list] = row;
    const where = norm(`${short(name)} ${aliases} ${name} ${place}`);
    const sc = score(where, tokens);
    if (sc !== null) schools.push({ item: school(row), score: sc, size: name.length });
    for (const [hallId, hall] of list) {
      // A hall matches on its own name, or on its name plus its school ("penn state geary").
      const own = score(norm(hall), tokens), both = own ?? score(`${norm(hall)} ${where}`, tokens);
      if (both !== null) halls.push({ item: { kind: "hall", title: hall, detail: short(name), href: `/colleges/${id}/${hallId}` }, score: own ?? both + 4, size: hall.length });
    }
  }
  const pageHits = pages.flatMap((p) => { const sc = score(norm(`${p.title} ${p.words}`), tokens); return sc === null ? [] : [{ item: page(p), score: sc, size: p.title.length }]; });
  return [
    { label: "Schools", hits: ranked(schools, 5) },
    { label: "Residence halls", hits: ranked(halls, 8) },
    { label: "Pages", hits: ranked(pageHits, 3) },
  ].filter((g) => g.hits.length);
}

/**
 * Search from any page (Kokonut Command Palette): a header button, ⌘K / Ctrl+K, or "/" opens a panel that
 * finds any of the schools, any residence hall and the main pages. A combobox: arrows move, Enter opens,
 * Escape closes and focus returns to the button. Full screen on phones.
 */
export default function SearchPalette({ hallFinder }: { hallFinder: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
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
    // The phone menu's "Search schools and halls" row (Nav) opens it too.
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
                aria-activedescendant={hits[active] ? `${listId}-${active}` : undefined} aria-label="Search schools, halls and pages"
                placeholder="Search schools, halls and pages" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={keys}
                spellCheck={false} autoComplete="off" autoCapitalize="off" enterKeyHint="go" />
              <button type="button" className={s.close} onClick={hide} aria-label="Close search">
                <span className={s.esc} aria-hidden="true">Esc</span>
                <span className={s.x}><CloseIcon size={18} /></span>
              </button>
            </div>
            <div className={s.results}>
              {rows === null ? (
                <p className={s.status} role="status">Loading schools…</p>
              ) : !hits.length ? (
                <p className={s.status} role="status">
                  Nothing matches “{query.trim()}”. Not listed? <Link href="/add-school" className="ds-link" onClick={() => setOpen(false)}>Add your school</Link>
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
        onFocus={() => void load()} aria-haspopup="dialog" aria-label="Search schools and halls" aria-keyshortcuts="Meta+K Control+K /"
        title="Search schools and halls (⌘K)">
        <SearchIcon size={18} />
      </button>
      {mounted && createPortal(panel, document.body)}
    </>
  );
}
