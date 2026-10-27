import css from "./RollingNumber.module.css";

const DIGITS = "0123456789".split("").map((d) => <b key={d}>{d}</b>);

/**
 * A number that rolls digit by digit when it changes (Vengeance Animated Number):
 * each digit is a 0–9 column shifted into place. Columns are keyed from the right
 * so units stay units when the length changes. Screen readers get the plain text.
 */
export default function RollingNumber({ value, className = "" }: { value: string; className?: string }) {
  const chars = value.split("");
  return (
    <span className={`${css.roll} ${className}`}>
      <span className="ds-sr">{value}</span>
      {chars.map((ch, i) =>
        /[0-9]/.test(ch) ? (
          <span key={chars.length - i} className={css.dc} aria-hidden="true">
            <span style={{ transform: `translateY(${-Number(ch)}em)` }}>{DIGITS}</span>
          </span>
        ) : (
          <span key={chars.length - i} aria-hidden="true">
            {ch}
          </span>
        ),
      )}
    </span>
  );
}
