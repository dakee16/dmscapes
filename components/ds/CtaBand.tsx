import css from "./CtaBand.module.css";

/**
 * The closing band on content pages: ink background, a display line with a
 * yellow serif tail, an optional note, and the action on the right.
 */
export default function CtaBand({
  lead,
  tail,
  note,
  children,
  tone = "ink",
}: {
  lead: React.ReactNode;
  tail?: React.ReactNode;
  note?: React.ReactNode;
  children?: React.ReactNode;
  tone?: "ink" | "blue" | "amber";
}) {
  return (
    <section className={css.band} data-tone={tone} aria-label="Get started">
      <div className={css.inner}>
        <div>
          <h2 className={`ds-h ${css.title}`} data-headline="">
            <span className="ds-line">
              <span className="ds-display">{lead}</span>
            </span>
            {tail && (
              <span className="ds-line">
                <span className={`ds-serif ${css.tail}`}>{tail}</span>
              </span>
            )}
          </h2>
          {note && <p className={css.note}>{note}</p>}
        </div>
        {children && (
          <div className={css.actions} data-reveal="">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
