"use client";

import CustomVibeBrief from "@/components/experience/CustomVibeBrief";
import styles from "@/components/experience/CustomVibe.module.css";

// The caller owns Pro access and the existing custom-vibe navigation.
export default function CreateVibeBanner({
  onSelect,
  unlocked = false,
}: {
  onSelect: () => void;
  unlocked?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={styles.banner}
      aria-label={`Create your own vibe. ${unlocked ? "Unlocked with Pro." : "Available with Pro."}`}
    >
      <span className={styles.bannerCopy}>
        <span className={styles.badge}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {unlocked ? <path d="m5 12 4 4L19 6" /> : <><rect x="5" y="10" width="14" height="11" rx="1" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>}
          </svg>
          {unlocked ? "Unlocked" : "Pro"}
        </span>
        <span className={styles.bannerTitle}>
          Create your <span>own vibe.</span>
        </span>
        <span className={styles.bannerDescription}>
          Describe your aesthetic. Find real products for your room.
        </span>
        <span className={styles.bannerAction} aria-hidden="true">
          Make it yours
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 19 19 5M5 5h14v14" />
          </svg>
        </span>
      </span>
      <CustomVibeBrief />
    </button>
  );
}
