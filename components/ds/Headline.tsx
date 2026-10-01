import type { ReactNode } from "react";

export interface HeadlineLine {
  text: ReactNode;
  /** Fraunces italic (the second voice of every headline) */
  serif?: boolean;
  /** pink/blue riso shadow (display lines only) */
  riso?: boolean;
  className?: string;
}

/**
 * The two-voice headline: Archivo display lines and Fraunces italic lines,
 * each in its own mask so the motion system can raise it into view.
 * `load` plays the reveal on first paint (heroes); otherwise it plays when
 * the headline scrolls into view.
 */
export default function Headline({
  as: Tag = "h2",
  lines,
  id,
  className = "",
  load = false,
  delayMs = 0,
}: {
  as?: "h1" | "h2" | "h3" | "p";
  lines: HeadlineLine[];
  id?: string;
  className?: string;
  load?: boolean;
  delayMs?: number;
}) {
  return (
    <Tag
      id={id}
      className={`ds-h ${className}`}
      data-headline={load ? "load" : ""}
      style={delayMs ? ({ "--d": `${delayMs}ms` } as React.CSSProperties) : undefined}
    >
      {lines.map((line, i) => (
        <span key={i} className={`ds-line ${line.className ?? ""}`}>
          <span
            className={[
              line.serif ? "ds-serif ds-serif--blue" : "ds-display",
              line.riso ? "ds-riso" : "",
            ].join(" ")}
          >
            {line.text}
          </span>
        </span>
      ))}
    </Tag>
  );
}
