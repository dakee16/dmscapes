import styles from "./CustomVibe.module.css";

/** An example brief, not an input or a generated product result. */
export default function CustomVibeBrief() {
  return (
    <span className={styles.brief} aria-hidden="true">
      <span className={styles.briefLabel}>An idea to start with</span>
      <span className={styles.briefQuote}>
        Warm oak. Cobalt blue. A little retro.
      </span>
      <span className={styles.briefPalette}>
        <span className={styles.swatches}>
          <i />
          <i />
          <i />
        </span>
        <span>Your words, your palette.</span>
      </span>
    </span>
  );
}
