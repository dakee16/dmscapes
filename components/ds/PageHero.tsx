import Image from "next/image";
import Headline, { type HeadlineLine } from "./Headline";
import css from "./PageHero.module.css";

export interface PageHeroArt {
  src: string;
  alt: string;
  /** natural width / height of the render */
  ratio: number;
  /** CSS object-position */
  position?: string;
  /** "contain" keeps the whole render in view (renders on a matching background) */
  fit?: "cover" | "contain";
}

/**
 * The content-page hero (design-handoff/designs/site/*): eyebrow, two-voice
 * headline, lede and actions on the left; a full-bleed render (or any visual)
 * on the right. The background runs up under the transparent nav, so pages
 * using it pass navOverlay to PageShell.
 */
export default function PageHero({
  bg = "var(--ds-sky)",
  tone = "light",
  crumbs,
  eyebrow,
  lines,
  lede,
  children,
  art,
  visual,
  titleId = "page-title",
  size = "lg",
  className = "",
}: {
  bg?: string;
  tone?: "light" | "dark";
  crumbs?: React.ReactNode;
  eyebrow?: React.ReactNode;
  lines: HeadlineLine[];
  lede?: React.ReactNode;
  children?: React.ReactNode;
  art?: PageHeroArt;
  /** any other right-hand visual (a to-scale plan, a ruler, a card) */
  visual?: React.ReactNode;
  titleId?: string;
  /** "lg": 1440×808 hero with art; "md": shorter, copy only or small visual */
  size?: "lg" | "md";
  className?: string;
}) {
  return (
    <header
      className={`${css.hero} ${className}`}
      data-size={size}
      data-tone={tone}
      data-art={art ? "image" : visual ? "visual" : "none"}
      style={{ background: bg }}
      aria-labelledby={titleId}
    >
      {art && (
        <div className={css.art} data-reveal-img="load" style={{ "--ratio": art.ratio } as React.CSSProperties}>
          <Image
            src={art.src}
            alt={art.alt}
            fill
            loading="eager"
            fetchPriority="high"
            quality={80}
            sizes="(min-width: 1024px) 50vw, 100vw"
            style={{ objectFit: art.fit ?? "cover", objectPosition: art.position ?? "50% 50%" }}
          />
        </div>
      )}
      <div className={css.inner}>
        <div className={css.copy}>
          {crumbs && <div className={css.crumbs}>{crumbs}</div>}
          {eyebrow && (
            <p className={`ds-eyebrow ${css.eyebrow}`} data-reveal="load">
              {eyebrow}
            </p>
          )}
          <Headline as="h1" id={titleId} load delayMs={60} className={`ds-h1 ${css.title}`} lines={lines} />
          {lede && (
            <div className={`ds-lede ${css.lede}`} data-reveal="load" style={{ "--i": 3 } as React.CSSProperties}>
              {lede}
            </div>
          )}
          {children && (
            <div className={css.actions} data-reveal="load" style={{ "--i": 4 } as React.CSSProperties}>
              {children}
            </div>
          )}
        </div>
        {visual && (
          <div className={css.visual} data-reveal="load" style={{ "--i": 2 } as React.CSSProperties}>
            {visual}
          </div>
        )}
      </div>
    </header>
  );
}
