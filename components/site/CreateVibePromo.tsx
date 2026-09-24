import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import { VibeMoodboard } from "@/components/experience/StudioMotion";
import styles from "@/components/experience/CustomVibe.module.css";

export default function CreateVibePromo() {
  return (
    <section id="create-your-own" className="dm-custom-promo" aria-labelledby="custom-vibe-heading">
      <div className={styles.promoGrid}>
        <Reveal className={styles.promoCopy}>
          <div className={styles.promoMeta}>
            <span className={styles.badge}>Pro</span>
            <span>Create your own vibe</span>
          </div>
          <h2 id="custom-vibe-heading" className={styles.promoHeading}>
            Your taste.
            <em>Your own vibe.</em>
          </h2>
          <p className={styles.promoDescription}>
            Describe your style. We’ll find the products.
          </p>
          <div className={styles.actions}>
            <Link href="/plan" className="dm-button">Build your own vibe</Link>
            <Link href="/pricing" className="dm-text-link">What Pro includes</Link>
          </div>
        </Reveal>
        <Reveal className={styles.visualWrap} delay={120}>
          <figure className={styles.visual}>
            <div className={styles.visualHeader}>
              <span>Dormscape / Vibe studio</span>
            </div>
            <VibeMoodboard />
            <figcaption className={styles.visualCaption}>
              <span>Illustrative style study</span>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
