import Image from "next/image";
import Headline from "@/components/ds/Headline";
import css from "./Home.module.css";

const ROWS = [
  { q: "“How big is my room?”", a: "Real dimensions for your exact hall" },
  { q: "“Will it fit?”", a: "Every piece placed on your floor plan" },
  { q: "“Do I need all this?”", a: "A list for your room, not every room" },
];

/** 02 · The problem: winging it vs planning. */
export default function ProblemSection() {
  return (
    <section className={`${css.section} ${css.problem}`} aria-labelledby="problem-title">
      <div className={`${css.inner} ${css.problemGrid}`}>
        <div className={css.problemCopy}>
          <div>
            <p className={`ds-eyebrow ${css.eyebrowGap}`} data-reveal="">
              Why dorm shopping goes wrong
            </p>
            <Headline
              id="problem-title"
              className={css.h2a}
              lines={[
                { text: "Winging it gets returned.", className: css.s },
                { text: "Planning fits.", serif: true, className: css.f },
              ]}
            />
            <p className={`ds-lede ${css.problemLede}`} data-reveal="">
              Housing pages list room sizes as approximate, if they list them at all. Generic packing lists run to
              dozens of items. So families buy blind, and the futon goes back.
            </p>
          </div>
          <dl className={css.qRows} data-stagger="">
            {ROWS.map((r) => (
              <div key={r.q} className={css.qRow} data-reveal="">
                <span className={css.qRule} data-draw="" aria-hidden="true" />
                <dt className={css.q}>{r.q}</dt>
                <dd className={css.a} style={{ margin: 0 }}>
                  {r.a}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={css.problemArt} data-reveal-img="">
          <Image
            src="/redesign/home-problem-futon-in-doorway.jpg"
            alt="A yellow futon jammed diagonally in the doorway of room 412, with moving boxes, a storage bin and a rolled rug waiting in the hall."
            fill
            quality={75}
            sizes="(min-width: 1024px) 41vw, 100vw"
          />
          <span className={css.winging}>
            <span className={css.wingingPill} data-pop="">
              WINGING IT
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
