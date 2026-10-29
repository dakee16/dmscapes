import Link from "next/link";
import Headline from "@/components/ds/Headline";
import { ALLOWED_LABEL, YES_NO_LABEL, bedRuleFor, checkedLabel } from "@/lib/bed-rules";
import css from "./BedRules.module.css";

/**
 * A school's lofting and bunking rules as its housing office publishes them
 * (lib/bed-rules), with the sources. Shown on the school page (#bed-rules); when
 * the school publishes nothing we could find, it says so and points to housing.
 */
export default function BedRules({ schoolId, short }: { schoolId: string; short: string }) {
  const r = bedRuleFor(schoolId);
  return (
    <section id="bed-rules" className="ds-section" aria-labelledby="bed-rules-title" style={{ scrollMarginTop: 80 }}>
      <div className="ds-wrap">
        <p className="ds-eyebrow" style={{ marginBottom: 18 }} data-reveal="">
          {short} loft and bunk rules
        </p>
        <Headline
          id="bed-rules-title"
          className="ds-h2 ds-h2--inline"
          lines={[{ text: "Can you loft" }, { text: "your bed here?", serif: true }]}
        />
        {r ? (
          <div className={css.card} data-reveal="">
            <dl className={css.facts}>
              <div data-v={r.loft}>
                <dt>Lofting</dt>
                <dd>{ALLOWED_LABEL[r.loft]}</dd>
              </div>
              <div data-v={r.bunk}>
                <dt>Bunking</dt>
                <dd>{ALLOWED_LABEL[r.bunk]}</dd>
              </div>
              <div data-v={r.risers}>
                <dt>Bed risers</dt>
                <dd>
                  {YES_NO_LABEL[r.risers]}
                  {r.risers === "yes" && r.riser_max_in ? `, up to ${r.riser_max_in} in` : ""}
                </dd>
              </div>
              <div data-v={r.own_loft_kits}>
                <dt>Your own loft kit</dt>
                <dd>{YES_NO_LABEL[r.own_loft_kits]}</dd>
              </div>
              {r.bed_height_in && (
                <div>
                  <dt>Bed height</dt>
                  <dd>
                    {r.bed_height_in.min}–{r.bed_height_in.max} in
                  </dd>
                </div>
              )}
            </dl>
            {(r.how || r.deadline || r.notes) && (
              <div className={css.text}>
                {r.how && <p>{r.how}</p>}
                {r.deadline && (
                  <p>
                    <b>Deadline:</b> {r.deadline}
                  </p>
                )}
                {r.notes && <p className={css.notes}>{r.notes}</p>}
              </div>
            )}
            <div className={css.sources}>
              <span>From {short}&apos;s housing pages, checked {checkedLabel()}:</span>
              <ul>
                {r.sources.map((s) => (
                  <li key={s.url}>
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="ds-link">
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <p className={css.none} data-reveal="">
            {short} doesn&apos;t publish lofting or bunking rules that we could find. Ask housing before you plan around a
            loft or buy risers.
          </p>
        )}
        <p className={css.foot}>
          Rules change and can differ by hall, so confirm with housing before you buy a loft kit or risers.{" "}
          <Link href="/dorm-bed-rules" className="ds-link">
            Every school&apos;s rules
          </Link>
          {" · "}
          <Link href="/loft-bed-clearance" className="ds-link">
            What fits under a loft
          </Link>
        </p>
      </div>
    </section>
  );
}

/** One line for a hall page: the school's loft and bunk answer, linking to the full rules. */
export function BedRulesNote({ schoolId, short, className = "" }: { schoolId: string; short: string; className?: string }) {
  const r = bedRuleFor(schoolId);
  if (!r) return null;
  return (
    <p className={`${css.note} ${className}`}>
      <b>Loft &amp; bunk at {short}:</b> lofting {ALLOWED_LABEL[r.loft].toLowerCase()}, bunking {ALLOWED_LABEL[r.bunk].toLowerCase()}.{" "}
      <Link href={`/colleges/${schoolId}#bed-rules`} className="ds-link">
        The rules and exceptions
      </Link>
    </p>
  );
}
