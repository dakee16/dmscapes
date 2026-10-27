"use client";

// Hall Finder's entry points outside the finder (design-handoff/hall-finder: 12-Home,
// 13-HomePhone, 14-College, 15-Planner, 17-Mentions). Each renders nothing unless Hall
// Finder is live or previewed (useHallFinderOn), so with the flag off every page matches
// main. The map cards are static SVGs from scripts/campus/sketch.mjs, never MapLibre.
import { useEffect, useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import Headline from "@/components/ds/Headline";
import { ArrowRight } from "@/components/ds/Icons";
import { useHallFinderOn } from "./useHallFinderOn";
import { formatMinutes, hallFinderOn, heroChipOn } from "@/lib/hall-finder";
import { seasonOn } from "@/lib/season";
import { track } from "@/lib/analytics";
import css from "./Entry.module.css";

type Where = "home" | "hero-chip" | "college-chip" | "college-band" | "planner" | "pricing" | "footer" | "hall-page";

/** One school's sample week from data/campus/sketch.json, as the server page passes it. */
export interface Example {
  collegeId: string;
  short: string;
  halls: number;
  top: { dormId: string; name: string; weekly: number }[];
}

const finderHref = (collegeId?: string) => (collegeId ? `/colleges/${collegeId}/hall-finder` : "/hall-finder");

function EntryLink({ where, href, className, children }: { where: Where; href: string; className?: string; children: ReactNode }) {
  return (
    <Link href={href} className={className} onClick={() => track("hall_finder_entry_clicked", { where })}>
      {children}
    </Link>
  );
}

const New = ({ className = "" }: { className?: string }) => (
  <span className={`${css.new} ${className}`}>
    <span className="ds-sr"> · </span>New
  </span>
);

/** The static campus map, cropped to its box; the ranking card and chip sit over it
 *  (on phones the card drops below the map so it never hides the routes). */
function MapCard({ example, rows, chip, className }: { example: Example; rows: number; chip?: boolean; className: string }) {
  return (
    <div className={`${css.map} ${className}`}>
      <div className={css.mapArt}>
        <Image
          src={`/hall-finder/${example.collegeId}.svg`}
          alt={`A map of ${example.short} with walking routes from ${example.top[0]?.name} to five class buildings.`}
          fill
          sizes="(min-width: 1024px) 660px, 100vw"
          className={css.mapImg}
        />
      </div>
      {chip && (
        <p className={css.mapChip}>
          schedule.ics <span className={css.mapChipNote}>· 5 places</span>
        </p>
      )}
      {rows > 0 && (
        <div className={css.rank}>
          {chip && <p className={css.rankHead}>Walking a week</p>}
          <ol>
            {example.top.slice(0, rows).map((h, i) => (
              <li key={h.dormId}>
                <i data-top={i === 0 || undefined}>{i + 1}</i>
                {i === 0 ? <strong>{h.name}</strong> : <span>{h.name}</span>}
                <b>{formatMinutes(h.weekly)}</b>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

const schools = (example: Example, others: number) => (others > 0 ? `${example.short} + ${others} more school${others === 1 ? "" : "s"}` : example.short);

/** Homepage section after How it works: "Pick the hall / closest to class." */
export function HomeSection({ example, others }: { example: Example; others: number }) {
  const on = useHallFinderOn();
  if (!on) return null;
  return (
    <section id="hall-finder" className={css.home} data-bg="#fbfaf6" aria-labelledby="hf-home-title">
      <div className={css.homeInner}>
        <div className={css.homeCopy}>
          <p className={`ds-eyebrow ${css.eyebrow}`}>
            <New />
            Hall Finder
          </p>
          <Headline
            id="hf-home-title"
            className={css.homeH}
            lines={[{ text: "Pick the hall", riso: true }, { text: "closest to class.", serif: true }]}
          />
          <p className={css.homeLede}>
            Upload your schedule or add your classes. We rank every hall by how long you&rsquo;d walk each week, and draw
            the real routes on the map.
          </p>
          <MapCard example={example} rows={3} className={css.homeMapPhone} />
          <ol className={css.steps}>
            <li>
              <b>01</b>
              <strong>Upload your schedule</strong> <span>A calendar file (.ics), or add classes by hand.</span>
            </li>
            <li>
              <b>02</b>
              <strong>See every hall ranked</strong> <span>By weekly walking time, with routes.</span>
            </li>
            <li>
              <b>03</b>
              <strong>Plan the room</strong> <span>Straight into your top pick.</span>
            </li>
          </ol>
          <div className={css.homeCta}>
            <EntryLink where="home" href="/hall-finder" className="ds-btn ds-btn--ink-yellow ds-btn--lg">
              Try Hall Finder
              <ArrowRight size={20} />
            </EntryLink>
            <p className={css.homeNote}>
              <span>{schools(example, others)}</span>
              <span className={css.homeNoteBreak}> · </span>
              <span>Your top pick is free</span>
            </p>
          </div>
        </div>
        <MapCard example={example} rows={3} chip className={css.homeMap} />
      </div>
    </section>
  );
}

/** The homepage hero chip: Jan 1 – Mar 31 (lib/hall-finder heroChipOn), and never while Halloween is on. */
export function HeroChip({ className, arrowClassName }: { className: string; arrowClassName?: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(heroChipOn(Date.now(), hallFinderOn()) && !seasonOn()), []);
  if (!show) return null;
  return (
    <EntryLink where="hero-chip" href="/hall-finder" className={`${className} ${css.heroChip}`}>
      <New className={css.newChip} />
      <span>Hall Finder for housing season</span>
      <ArrowRight size={16} className={arrowClassName} />
    </EntryLink>
  );
}

/** College page, above the eyebrow (pilot schools only; the page decides). */
export function CollegeChip({ collegeId, short }: { collegeId: string; short: string }) {
  const on = useHallFinderOn();
  if (!on) return null;
  return (
    <EntryLink where="college-chip" href={finderHref(collegeId)} className={css.collegeChip}>
      <New className={css.newChip} />
      <span>Hall Finder: which {short} hall is closest to your classes?</span>
      <ArrowRight size={16} />
    </EntryLink>
  );
}

/** College page, the dark band after the tape stats. */
export function CollegeBand({ example, allHalls }: { example: Example; allHalls: boolean }) {
  const on = useHallFinderOn();
  if (!on) return null;
  return (
    <section className={css.bandWrap} aria-labelledby="hf-band-title">
      <div className={css.band}>
        <div className={css.bandCopy}>
          <p className={`ds-eyebrow ${css.eyebrow} ${css.bandEyebrow}`}>
            <New />
            Hall Finder · {example.short}
          </p>
          <Headline
            id="hf-band-title"
            className={css.bandH}
            lines={[{ text: "Which hall is closest" }, { text: "to your classes?", serif: true }]}
          />
          <p className={css.bandLede}>
            {`Upload your schedule or add your classes. We rank ${allHalls ? "all " : ""}${example.halls} ${example.short} halls by `}weekly
            walking time and draw the routes.
          </p>
          <ol className={css.facts}>
            <li>
              <b>01</b>Works with a calendar file (.ics) of your schedule, or add classes by hand
            </li>
            <li>
              <b>02</b>Real walking routes, AC and room sizes for every hall
            </li>
            <li>
              <b>03</b>Plan the room in your top pick with one tap
            </li>
          </ol>
          <div className={css.bandCta}>
            <EntryLink where="college-band" href={finderHref(example.collegeId)} className="ds-btn ds-btn--yellow">
              Open Hall Finder
              <ArrowRight size={18} />
            </EntryLink>
            <span className={css.bandNote}>Free account · your top pick is free</span>
          </div>
        </div>
        <MapCard example={example} rows={2} className={css.bandMap} />
      </div>
    </section>
  );
}

/** Planner step 01, above the building list. */
export function PlannerCard({ collegeId }: { collegeId: string }) {
  const on = useHallFinderOn();
  if (!on) return null;
  return (
    <EntryLink where="planner" href={finderHref(collegeId)} className={css.plannerCard}>
      <span className={css.plannerCardText}>
        <strong>
          Not sure which one? <New />
        </strong>
        <span>Rank them by your classes</span>
      </span>
      <ArrowRight size={20} />
    </EntryLink>
  );
}

/** Planner step 01, the big callout while no hall is picked. */
export function PlannerCallout({ example, allHalls }: { example: Example; allHalls: boolean }) {
  const on = useHallFinderOn();
  if (!on) return null;
  return (
    <section className={css.callout} aria-labelledby="hf-callout-title">
      <div className={css.calloutMap} aria-hidden="true">
        <Image src={`/hall-finder/${example.collegeId}.svg`} alt="" fill sizes="(min-width: 1024px) 420px, 100vw" className={css.mapImg} />
      </div>
      <div className={css.calloutCopy}>
        <p className={`ds-eyebrow ${css.eyebrow}`}>
          <New />
          Hall Finder
        </p>
        <h2 id="hf-callout-title" className={css.calloutH}>
          Not sure which building?
        </h2>
        <p className={css.calloutText}>
          {`Hall Finder ranks ${allHalls ? "all " : ""}${example.halls} ${example.short} halls by `}how far you&rsquo;d walk
          to your classes. Pick the winner and you&rsquo;re straight back here.
        </p>
        <div className={css.calloutCta}>
          <EntryLink where="planner" href={finderHref(example.collegeId)} className="ds-btn ds-btn--ink-yellow">
            Find my hall
            <ArrowRight size={18} />
          </EntryLink>
          <span className={css.calloutNote}>Your top pick is free</span>
        </div>
      </div>
    </section>
  );
}

/** The Plus perk row (pricing cards, upgrade sheet): `link` only where leaving the page is fine. */
export function PlusPerk({ check, className = "", link = false }: { check: ReactNode; className?: string; link?: boolean }) {
  const on = useHallFinderOn();
  if (!on) return null;
  const name = <strong>Hall Finder</strong>;
  return (
    <li className={`${className} ${css.perk}`}>
      {check}
      <span>
        {link ? (
          <EntryLink where="pricing" href="/hall-finder" className={css.perkLink}>
            {name}
          </EntryLink>
        ) : (
          name
        )}{" "}
        at select schools <New />
      </span>
    </li>
  );
}

/** Footer, Product column, after My Room. */
export function FooterLink() {
  const on = useHallFinderOn();
  if (!on) return null;
  return (
    <li>
      <EntryLink where="footer" href="/hall-finder" className={css.footer}>
        Hall Finder <New />
      </EntryLink>
    </li>
  );
}

/** Methodology, how Hall Finder counts minutes (wording approved by the owner). */
export function WalkTimes() {
  const on = useHallFinderOn();
  if (!on) return null;
  return (
    <section id="walk-times" className="ds-section" aria-labelledby="walk-title">
      <div className={`ds-wrap ${css.walk}`}>
        <Headline id="walk-title" className="ds-h2" lines={[{ text: "Walk" }, { text: "times.", serif: true }]} />
        <div className={css.walkText} data-reveal="">
          <p>
            <Link href="/hall-finder" className="ds-link">
              Hall Finder
            </Link>
            &rsquo;s minutes come from walking routes along OpenStreetMap&rsquo;s paths and sidewalks, door to door, at an
            average pace of 1.35 metres a second (about 3 mph); steps count a little longer. A week&rsquo;s walk is, for
            each place, the days you go × the one-way walk × 2.
          </p>
          <p>
            It doesn&rsquo;t include buses, waits at crossings or the order of your classes, so use it to compare halls
            rather than as a stopwatch.
          </p>
          <p className={css.walkNote}>
            Map data ©{" "}
            <a href="https://www.openstreetmap.org/copyright" className="ds-link" target="_blank" rel="noopener noreferrer">
              OpenStreetMap contributors
            </a>
            , under the Open Database License.
          </p>
        </div>
      </div>
    </section>
  );
}

/** One of a hall's nearest places, as the hall page passes it. */
export interface NearPlace {
  name: string;
  /** "Dining", "Library" or "Gym". */
  kind: string;
  minutes: number;
}

/** Hall page (16-Hall): "Walk times from your door" with the hall's own map, and the card
 *  into the finder with this hall preselected for comparison. Free; no sign-in. */
export function HallWalks({ collegeId, dormId, hall, area, short, halls, allHalls, near }: { collegeId: string; dormId: string; hall: string; area: string | null; short: string; halls: number; allHalls: boolean; near: NearPlace[] }) {
  const on = useHallFinderOn();
  if (!on || !near.length) return null;
  return (
    <section className={css.hall} aria-labelledby="hf-walk-title">
      <div className={css.hallInner}>
        <div className={css.hallCopy}>
          <p className={`ds-eyebrow ${css.eyebrow}`}>Around {hall}{area ? ` · ${area}` : ""}</p>
          <Headline id="hf-walk-title" className={css.hallH} lines={[{ text: "Walk times" }, { text: "from your door.", serif: true }]} />
          <ol className={css.hallList}>
            {near.map((p, i) => (
              <li key={p.kind}>
                <span className={css.hallPin} aria-hidden="true">{i + 1}</span>
                <span className={css.hallPlace}>
                  <strong>{p.name}</strong>
                  <span>{p.kind}</span>
                </span>
                <b>{Math.max(1, Math.round(p.minutes))} min</b>
              </li>
            ))}
          </ol>
          <div className={css.hallCard}>
            <p className={css.hallCardTitle}>
              <New /> Got your class schedule?
            </p>
            <p className={css.hallCardText}>
              {`See how ${hall} stacks up. Hall Finder ranks ${allHalls ? "all " : ""}${halls} ${short} halls by `}your classes, with the
              real walking routes.
            </p>
            <div className={css.hallCardCta}>
              <EntryLink where="hall-page" href={`${finderHref(collegeId)}?compare=${dormId}`} className="ds-btn ds-btn--yellow">
                Open Hall Finder
                <ArrowRight size={18} />
              </EntryLink>
              <span>Your top pick is free</span>
            </div>
          </div>
        </div>
        <div className={css.hallMap}>
          <Image
            src={`/hall-finder/${collegeId}/${dormId}.svg`}
            alt={`A map of the walking routes from ${hall} to ${near.map((p) => p.name).join(", ")}.`}
            fill
            sizes="(min-width: 1024px) 660px, 100vw"
            className={css.mapImg}
          />
          <p className={css.hallCredit}>© OpenStreetMap contributors · OpenFreeMap</p>
        </div>
      </div>
    </section>
  );
}

/** Hall page hero, under the buttons: "Is it close to your classes? Check in Hall Finder". */
export function HallHeroLink({ collegeId, dormId }: { collegeId: string; dormId: string }) {
  const on = useHallFinderOn();
  if (!on) return null;
  return (
    <EntryLink where="hall-page" href={`${finderHref(collegeId)}?compare=${dormId}`} className={css.heroLink}>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z" />
        <circle cx="12" cy="9.5" r="2.5" />
      </svg>
      <span>Is it close to your classes? Check in Hall Finder</span>
    </EntryLink>
  );
}
