import Link from "next/link";
import Reveal from "@/components/site/Reveal";
import RoomModel from "@/components/experience/RoomModel";
import CustomVibeBrief from "@/components/experience/CustomVibeBrief";
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
            A movie set, a color you love, an aesthetic all your own.
            Describe it in your words. Dormscape finds real products and
            arranges them for your room and budget.
          </p>
          <ul className={styles.benefits}>
            <li><span>01</span> Your words</li>
            <li><span>02</span> Real products</li>
            <li><span>03</span> Your budget</li>
          </ul>
          <div className={styles.actions}>
            <Link href="/plan" className="dm-button">Build your own vibe</Link>
            <Link href="/pricing" className="dm-text-link">What Pro includes</Link>
          </div>
        </Reveal>
        <Reveal className={styles.visualWrap} delay={120}>
          <figure className={styles.visual}>
            <div className={styles.visualHeader}>
              <span>Dormscape / Vibe studio</span>
              <span>Made personal.</span>
            </div>
            <RoomModel vibe="cozy" className={styles.visualRoom} />
            <CustomVibeBrief />
            <figcaption className={styles.visualCaption}>
              <span>Illustrative style study</span>
              <span className="dm-room-interaction-hint">Drag to explore</span>
            </figcaption>
          </figure>
        </Reveal>
      </div>
    </section>
  );
}
