import css from "./Home.module.css";

/**
 * A homepage section headline: two Archivo display lines (the Fraunces italic
 * voice is kept for the hero). With motion on, HomeFlow slides the two in from
 * opposite sides as the headline scrolls in (Skiper Horizontal Text Reveal).
 */
export default function H2({
  id,
  s,
  f,
  riso = false,
  className = "",
}: {
  id: string;
  s: React.ReactNode;
  f: React.ReactNode;
  riso?: boolean;
  className?: string;
}) {
  return (
    <h2 id={id} className={`${css.h2} ${className}`} data-rv="h2">
      <span className={`ds-display ${riso ? "ds-riso " : ""}${css.s}`}>{s}</span>{" "}
      <span className={`ds-display ${css.f}`}>{f}</span>
    </h2>
  );
}
