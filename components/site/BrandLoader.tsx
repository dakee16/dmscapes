import s from "./BrandLoader.module.css";

// The mark's three pieces, each in its own box (design-handoff/v2/logo, Loader.dc.html).
const ARCH = "M885 35.8A668.9 668.9 0 0 0 0 634.5L0 667L216.6 579A451.9 451.9 0 0 1 885 204.7Z";
const TOP = "M216 0L0 87L0 407.8A696.6 696.6 0 0 1 216 442.5Z";
const DOOR = "M0 -0.8L0 490L216 490L216 59A423.9 423.9 0 0 0 0 -0.8Z";

const piece = (cls: string, box: string, d: string) => (
  <span className={cls}>
    <svg viewBox={box} preserveAspectRatio="none">
      <path d={d} />
    </svg>
  </span>
);

/** The mark alone, its door swinging (MOTION.md · Loader). */
function Mark() {
  return (
    <span className={s.mark} aria-hidden="true">
      {piece(`${s.pc} ${s.ghost}`, "0 0 886 668", ARCH)}
      {piece(`${s.pc} ${s.arch}`, "0 0 886 668", ARCH)}
      {piece(`${s.pc} ${s.top}`, "0 0 217 444", TOP)}
      {piece(`${s.pc} ${s.door}`, "0 0 217 491", DOOR)}
    </span>
  );
}

/**
 * The sitewide loader, "the door swings": the mark is a door seen from above,
 * the way a floor plan draws it. The curve folds in toward its hinge at the
 * upright and swings back out on a 2.6 s loop, over a faint ghost of its path,
 * with a "Loading" caption whose dot brightens once per loop. Still in reduced
 * motion and with Motion off.
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
