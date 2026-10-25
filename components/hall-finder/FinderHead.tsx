import Link from "next/link";
import styles from "./HallFinder.module.css";

/** The finder's heading block (crumbs, eyebrow, H1, the honest line). The page shows it while the
 *  interactive finder loads, so the H1 and intro are in the server HTML for crawlers that don't
 *  run JavaScript; the finder renders the same block once it has loaded. */
export default function FinderHead({ collegeId, schoolName }: { collegeId: string; schoolName: string }) {
  return (
    <>
      <p className={styles.crumbs}>
        <Link href="/colleges">Colleges</Link> / <Link href={`/colleges/${collegeId}`}>{schoolName}</Link> / Hall Finder
      </p>
      <div className={styles.eyebrowRow}>
        <p className={styles.eyebrow}>{schoolName} · Hall Finder</p>
      </div>
      <h1 className={styles.title}>
        <span className="ds-sr">{schoolName}: </span>
        <span className={`${styles.titleBig} ds-riso`}>Find your hall</span>
        <span className={`${styles.titleSerif} ds-serif ds-serif--blue`}>by your classes.</span>
      </h1>
      <p className={styles.honest}>Most schools assign rooms. Use this to rank your housing preferences.</p>
    </>
  );
}

/** The same block laid out like the finder's head, as the page's loading shell. */
export function FinderShell(props: { collegeId: string; schoolName: string }) {
  return (
    <div className={styles.layout} data-view="input">
      <div className={styles.head}>
        <FinderHead {...props} />
      </div>
    </div>
  );
}
