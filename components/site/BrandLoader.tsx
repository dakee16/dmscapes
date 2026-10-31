import s from "./BrandLoader.module.css";

// The room mark (public/brand/dormscape-mark-ink.svg): the "d" with an L-shaped
// room cut out of its bowl, and the room itself in its own box so it can fill.
const SHELL =
  "M241 39L337 0V211.4A252 237 0 0 0 241 193.5Z" +
  "M337 223.2A241 226 0 0 0 0 430.5V485.5A88 88 0 0 0 88 573.5H337ZM147 288.5H241V497.5H67V388.5H147Z";
const ROOM = "M159.5 301H228.5V485H79.5V401H159.5Z";

/** The mark alone, its room filling. */
function Mark() {
  return (
    <span className={s.mark} aria-hidden="true">
      <svg viewBox="0 0 337 573.5">
        <path d={SHELL} fillRule="evenodd" />
      </svg>
      <span className={s.room}>
        <svg viewBox="79.5 301 149 184" preserveAspectRatio="none">
          <path d={ROOM} />
        </svg>
      </span>
    </span>
  );
}

/**
 * The sitewide loader, "the room fills": the blue room inside the mark fills
 * from the floor up and clears on a 2.6 s loop, with a "Loading" caption whose
 * dot brightens once per loop. Still (the full mark) in reduced motion and with
 * Motion off.
 *
 * Sizes: "route" (88 px, full-screen loading), "panel" (48 px) and "inline"
 * (18 px, inside a button beside its own text; decorative there). `label` is
 * what screen readers hear; the caption always reads "Loading".
 */
export default function BrandLoader({
  label = "Loading…",
  className = "",
  size = "route",
  tone = "light",
}: {
  label?: string;
  className?: string;
  size?: "route" | "panel" | "inline";
  tone?: "light" | "dark";
}) {
  if (size === "inline") {
    return (
      <span className={`${s.inline} ${className}`} data-anim="">
        <Mark />
      </span>
    );
  }
  return (
    <div
      className={`${s.loader} ${className}`}
      data-size={size}
      data-tone={tone}
      data-anim=""
      role="status"
      aria-label={label || "Loading"}
    >
      <Mark />
      <span className={s.caption} aria-hidden="true">
        <i />
        Loading
      </span>
    </div>
  );
}
