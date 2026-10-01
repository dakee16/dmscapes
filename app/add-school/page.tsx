import type { Metadata } from "next";
import Link from "next/link";
import PageShell from "@/components/ds/PageShell";
import PageHero from "@/components/ds/PageHero";
import Headline from "@/components/ds/Headline";
import { ArrowRight } from "@/components/ds/Icons";
import SchoolRequestForm from "@/components/add-school/SchoolRequestForm";
import QueuePromo from "@/components/add-school/QueuePromo";
import measure from "@/content/blog/how-to-measure-your-dorm-room";
import css from "@/components/add-school/AddSchool.module.css";

export const metadata: Metadata = {
  description:
    "Add your college to the Dormscape dorm room planner. Tell us the building and room size and we'll add it.",
};

export default function AddSchoolPage() {
  return (
    <PageShell navOverlay>
      <PageHero
        bg="var(--ds-paper)"
        size="md"
        className={css.hero}
        eyebrow="Every campus, eventually"
        lines={[
          { text: "Add your", riso: true },
          { text: "school.", serif: true },
        ]}
        lede={
          <>
            <p>Know your room&rsquo;s size? Even better. Measurements help us support your dorm faster.</p>
            <p>Just the college name and your email are required.</p>
          </>
        }
        visual={<SchoolRequestForm />}
      >
        <div className={css.aside}>
          <QueuePromo />
          <p className={css.cantWait}>
            Can&rsquo;t wait?{" "}
            <Link href="/plan/draw" className="ds-link">
              Draw your room in 2D
            </Link>{" "}
            and plan it today.
          </p>
        </div>
      </PageHero>

      <section className={`ds-section--tight ${css.wait}`} aria-labelledby="wait-title">
        <div className="ds-wrap">
          <Headline
            id="wait-title"
            className="ds-h2 ds-h2--inline"
            lines={[{ text: "While you" }, { text: "wait.", serif: true }]}
          />
          <ul className={css.waitGrid}>
            <li data-reveal="">
              <Link href={`/blog/${measure.slug}`} className={css.waitCard}>
                <span className={css.waitText}>
                  <span className={css.waitTitle}>{measure.title}</span>
                  <span className={css.waitMeta}>Blog · {measure.readingTimeMin} min read</span>
                </span>
                <ArrowRight size={24} />
              </Link>
            </li>
            <li data-reveal="" style={{ "--i": 1 } as React.CSSProperties}>
              <Link href="/plan/draw" className={css.waitCard} data-tone="ink">
                <span className={css.waitText}>
                  <span className={css.waitTitle}>Draw your exact room</span>
                  <span className={css.waitMeta}>Trace your walls, add doors, windows and closets · Plus</span>
                </span>
                <ArrowRight size={24} />
              </Link>
            </li>
          </ul>
        </div>
      </section>
    </PageShell>
  );
}
