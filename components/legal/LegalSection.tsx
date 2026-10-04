import { LEGAL_DOCS, sectionNumber, type LegalKey, type LegalSectionId } from "./docs";
import css from "./Legal.module.css";

/**
 * One numbered section of a legal document. The heading comes from
 * LEGAL_DOCS so it always matches the contents list; the body is passed in
 * unchanged from the route's page.tsx.
 */
export default function LegalSection<K extends LegalKey>({
  doc,
  id,
  children,
}: {
  doc: K;
  id: LegalSectionId<K>;
  children: React.ReactNode;
}) {
  const sections: readonly { id: string; title: string }[] = LEGAL_DOCS[doc].sections;
  const index = sections.findIndex((s) => s.id === id);
  if (index < 0) throw new Error(`Unknown ${doc} section: ${id}`);
  const { title } = sections[index];

  return (
    <section id={id} className={css.section} aria-labelledby={`${id}-title`}>
      <span className={`ds-num ${css.num}`} aria-hidden="true">
        {sectionNumber(index)}
      </span>
      <div className={`ds-prose ${css.body}`}>
        <h2 id={`${id}-title`}>{title}</h2>
        {children}
      </div>
    </section>
  );
}
