import css from "./Home.module.css";

/**
 * A homepage section headline: an Archivo display line over a Fraunces italic
 * line. With motion on, HomeFlow slides the two in from opposite sides as the
 * headline scrolls in (Skiper Horizontal Text Reveal).
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
      <span className={`ds-serif ${css.f}`}>{f}</span>
    </h2>
  );
}
