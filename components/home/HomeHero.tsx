import Image from "next/image";
import Link from "next/link";
import { HeroChip } from "@/components/hall-finder/Entry";
import { HAPPY_CUSTOMERS, HERO_ROOM, RATING, feetInches, spokenFeet } from "@/lib/home-data";
import GalaxyBand from "./GalaxyBand";
import HomeSearch from "./HomeSearch";
import css from "./Hero.module.css";

/**
 * 01 · Hero, built around the live room call (design-handoff/v2 Main.dc.html):
 * Jake and Cooper plan the real Penn State Geary Hall double on a 12 s loop of
 * CSS keyframes (MOTION.md · Hero). The room is five stacked renders moved by
 * transform; the galaxy band and its props drift behind it. Everything rests
 * in its finished state with Motion off or reduced motion.
 */
export default function HomeHero({ schoolCount, hallCount }: { schoolCount: number; hallCount: number }) {
  const dims = HERO_ROOM ? (
    <span className={css.ft}>
      {feetInches(HERO_ROOM.lengthFt)} × {feetInches(HERO_ROOM.widthFt)}
    </span>
  ) : null;
  return (
    <section className={css.hero} aria-labelledby="hero-title">
      <div className={css.paper} aria-hidden="true" />
      <div className={`ds-wrap ${css.copy}`}>
        <HeroChip className={`ds-tag ${css.chip}`} />
        <p className="ds-eyebrow">
          AI dorm room planner{" "}
          <span className={css.wide}>
            · {schoolCount} schools · {hallCount.toLocaleString("en-US")} halls
          </span>
          <span className={css.narrow}>· free to start</span>
        </p>
        <h1 id="hero-title" className={css.h1}>
          <span className={`ds-display ds-riso ${css.l1}`}>Your dorm,</span>{" "}
          <span className={`ds-serif ${css.l2}`}>
            planned to <span className={css.blue}>the inch.</span>
          </span>
        </h1>
        <p className={`ds-lede ${css.lede}`}>
          Find your exact room, choose a style and set a budget. Get a dorm room layout that fits and a shoppable list,
          before move-in day.
        </p>
        <div className={css.searchWrap}>
          <HomeSearch />
        </div>
        <p className={css.proof}>
          <Stars rating={RATING} />
          <span>
            <strong>{RATING}/5</strong> · {HAPPY_CUSTOMERS.toLocaleString("en-US")}+ happy customers
          </span>
          <span className={css.sep} aria-hidden="true" />
          <span className={css.note}>No account needed to explore</span>
          <span className={css.sep} aria-hidden="true" />
          <span className={css.note}>Saving is always free</span>
        </p>
      </div>

      <div className={css.stageZone}>
        <GalaxyBand />
        <div className={css.stageWrap} data-anim="">
          <div className={css.island} aria-hidden="true">
            <span className={css.live}>
              <i />
              Live demo
            </span>
            <span className={css.islandText}>Jake and Cooper are planning their room on a call</span>
            <span className={css.eq}>
              <b />
              <b />
              <b />
              <b />
            </span>
          </div>
          {HERO_ROOM && <Stage dims={dims} />}
          <div className={css.sideCards} aria-hidden="true">
            <div className={css.who}>
              <p className={css.whoHead}>
                Who brings what<span>4 ITEMS</span>
              </p>
              <Row title="Mini fridge" sub="Bringing from home" tag="s" />
              <Row title={<>Rug · 6′ × 4′</>} sub="To buy" tag="s" className={css.rowRug} />
              <Row title="Bean bag" sub="Bringing from home" tag="c" className={css.rowBean} />
              <Row title="String lights" sub="To buy" tag="j" />
            </div>
            <div className={css.act}>
              <p className={css.actHead}>
                <i />
                Activity
              </p>
              <ol className={css.actList}>
                <li className={`${css.ai} ${css.aiBed}`} style={{ top: 0 }}>
                  <span className={`${css.av} ${css.avJ}`}>J</span>
                  <span><strong>Jake claimed the back bed</strong><small>Cooper took the front one</small></span>
                </li>
                <li className={`${css.ai} ${css.aiRug}`} style={{ top: 70 }}>
                  <span className={`${css.av} ${css.avJ}`}>J</span>
                  <span><strong>Jake moved the rug</strong><small>6′ × 4′ · Shared</small></span>
                </li>
                <li className={`${css.ai} ${css.aiBean}`} style={{ top: 140 }}>
                  <span className={`${css.av} ${css.avC}`}>C</span>
                  <span><strong>Cooper moved the bean bag</strong><small>Under the window · Cooper&apos;s</small></span>
                </li>
                <li className={`${css.ai} ${css.aiBase}`} style={{ top: 210 }}>
                  <span className={`${css.av} ${css.avJ}`}>J</span>
                  <span><strong>Jake joined the room call</strong><small>Room call · 2 on the call</small></span>
                </li>
              </ol>
            </div>
          </div>
        </div>
        {HERO_ROOM && (
          <p className={css.heroCap}>
            Real room · <Link href={HERO_ROOM.href}>{HERO_ROOM.school}, {HERO_ROOM.hall}</Link> · {dims}
          </p>
        )}
      </div>
    </section>
  );
}

const TAG = { s: [css.otagS, "Shared"], c: [css.otagC, "Cooper's"], j: [css.otagJ, "Jake's"] } as const;

function Tag({ who, className = "" }: { who: keyof typeof TAG; className?: string }) {
  return (
    <span className={`${css.otag} ${TAG[who][0]} ${className}`}>
      <i />
      {TAG[who][1]}
    </span>
  );
}

function Row({ title, sub, tag, className = "" }: { title: React.ReactNode; sub: string; tag: keyof typeof TAG; className?: string }) {
  return (
    <div className={`${css.row} ${className}`}>
      <span>
        <strong>{title}</strong>
        <small>{sub}</small>
      </span>
      <Tag who={tag} />
    </div>
  );
}

const ARROW = "M3 2L3 19L7.6 14.9L10.6 21.2L13.4 20L10.5 13.8L16.6 13.7Z";

/** The room call itself: a decorative demo, described once for screen readers. */
function Stage({ dims }: { dims: React.ReactNode }) {
  const room = HERO_ROOM!;
  const layer = (cls: string, src: string, lcp = false) => (
    <span className={`${css.ly} ${cls}`}>
      <Image
        src={src}
        alt=""
        fill
        sizes={lcp ? "(max-width: 900px) 100vw, 900px" : "(max-width: 900px) 34vw, 300px"}
        loading="eager"
        fetchPriority={lcp ? "high" : undefined}
        quality={80}
      />
    </span>
  );
  return (
    <div
      className={css.stage}
      role="img"
      aria-label={`A live demo: Jake and Cooper plan the ${room.school} ${room.hall} double, ${spokenFeet(room.lengthFt)} by ${spokenFeet(room.widthFt)}, in 3D on a room call. They move the bean bag under the window and the rug between the beds, the rug's 6 by 4 foot size draws in, and each piece is tagged with its owner.`}
    >
      <div className={css.bar}>
        <span className={css.barMark}>
          dormscape<i />
        </span>
        <span className={css.vrule} />
        <div className={css.roomId}>
          <strong>
            {room.school} · {room.hall}
          </strong>
          <span>DOUBLE · {dims}</span>
        </div>
        <div className={css.vswitch}>
          <span>2D</span>
          <span data-on="">3D</span>
        </div>
        <div className={css.callpill}>
          <span className={css.faces}>
            <i className={`${css.av} ${css.avJ}`}>
              J<b className={`${css.ring} ${css.ringJ}`} />
            </i>
            <i className={`${css.av} ${css.avC}`}>
              C<b className={`${css.ring} ${css.ringC}`} />
            </i>
          </span>
          <span className={css.cpLabel}>Room call</span>
          <span className={css.cpTime}>12:48</span>
          <span className={css.mic}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <rect x="9" y="3" width="6" height="11" rx="3" />
              <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
            </svg>
          </span>
        </div>
        <span className={css.share}>Share room</span>
      </div>
      <div className={css.view}>
        {layer(css.lyRoom, "/redesign/hero-room-v3.webp", true)}
        {layer(css.lyRug, "/redesign/hero-rug.webp")}
        {layer(css.lyOcc, "/redesign/hero-occluder-v3.webp")}
        {layer(css.lyBean, "/redesign/hero-bean.webp")}
        {layer(css.lyFront, "/redesign/hero-front.webp")}
        <svg className={css.dims} viewBox="0 0 1000 583.333" preserveAspectRatio="xMidYMid meet">
          <line className={`${css.dl} ${css.dlF}`} pathLength={1} x1="368.78" y1="286.46" x2="516.28" y2="378.13" />
          <line className={`${css.dl} ${css.dlR}`} pathLength={1} x1="538.56" y1="376.14" x2="620.22" y2="302.39" />
          <line className={`${css.tk} ${css.tkF}`} x1="375.46" y1="280.43" x2="363.58" y2="291.15" />
          <line className={`${css.tk} ${css.tkF}`} x1="522.96" y1="372.1" x2="511.08" y2="382.82" />
          <line className={`${css.tk} ${css.tkR}`} x1="530.92" y1="371.39" x2="544.51" y2="379.83" />
          <line className={`${css.tk} ${css.tkR}`} x1="612.58" y1="297.64" x2="626.17" y2="306.08" />
        </svg>
        <span className={css.at} style={{ left: "43.06%", top: "58.81%" }}>
          <span className={`${css.dlbl} ${css.popDf}`}>6′0″</span>
        </span>
        <span className={css.at} style={{ left: "59.3%", top: "59.61%" }}>
          <span className={`${css.dlbl} ${css.popDr}`}>4′0″</span>
        </span>
        <span className={css.at} style={{ left: "50.08%", top: "22.29%" }}>
          <Tag who="j" className={css.popBedA} />
        </span>
        <span className={css.at} style={{ left: "33.45%", top: "43.89%" }}>
          <Tag who="c" className={css.popBedB} />
        </span>
        <span className={css.at} style={{ left: "49.29%", top: "49.07%" }}>
          <Tag who="s" className={css.popRug} />
        </span>
        <span className={css.at} style={{ left: "62.67%", top: "28.46%" }}>
          <Tag who="c" className={css.popBean} />
        </span>
        <div className={css.toastAt}>
          <div className={css.toast}>
            <span className={css.toastTick}>
              <svg width="11" height="11" viewBox="0 0 12 10" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 5l3.5 3.5L11 1" />
              </svg>
            </span>
            Saved as you go
          </div>
        </div>
        <div className={`${css.cur} ${css.curJ}`}>
          <div className={css.curIn}>
            <svg className={css.arrow} viewBox="0 0 22 22">
              <path d={ARROW} fill="#2449ff" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className={css.cname}>
              Jake
              <span className={css.bars}>
                <b />
                <b />
                <b />
              </span>
            </span>
            <span className={`${css.cap} ${css.capJ1}`}>Love it. Rug next.</span>
            <span className={`${css.cap} ${css.capJ2}`}>Done. Split the cart?</span>
          </div>
        </div>
        <div className={`${css.cur} ${css.curC}`}>
          <div className={css.curIn}>
            <svg className={css.arrow} viewBox="0 0 22 22">
              <path d={ARROW} fill="#c0186f" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            <span className={css.cname}>
              Cooper
              <span className={css.bars}>
                <b />
                <b />
                <b />
              </span>
            </span>
            <span className={`${css.cap} ${css.capC1}`}>Bean bag under the window?</span>
            <span className={`${css.cap} ${css.capC2}`}>Six by four. It fits.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const STAR = "M10 1.6l2.6 5.3 5.8.8-4.2 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.6 7.7l5.8-.8z";

/** Five stars, the top row clipped to the rating (4.5 → 90% wide). */
function Stars({ rating }: { rating: number }) {
  const row = (filled: boolean) => (
    <svg width="100" height="20" viewBox="0 0 100 20" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <path key={i} d={STAR} transform={`translate(${i * 20} 0)`} fill={filled ? "var(--ds-tape)" : "none"} stroke="var(--ds-ink)" strokeWidth="1.4" strokeLinejoin="round" />
      ))}
    </svg>
  );
  return (
    <span className={css.stars} role="img" aria-label={`Rated ${rating} out of 5`}>
      {row(false)}
      <span className={css.starsFill} style={{ width: `${(rating / 5) * 100}%` }}>
        {row(true)}
      </span>
    </span>
  );
}
