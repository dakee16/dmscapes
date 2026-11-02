"use client";

import { useId, useState } from "react";
import css from "./Gallery.module.css";

/** Kokonut Minimal FAQ: one answer open at a time, the first by default. Answers stay in the page for search. */
export default function GalleryFaq({ faqs }: { faqs: { q: string; a: string }[] }) {
  const [open, setOpen] = useState(0);
  const id = useId();
  return (
    <div className={css.faq}>
      {faqs.map(({ q, a }, i) => {
        const isOpen = open === i;
        return (
          <div key={q} className={css.fItem}>
            <h3 className={css.fQ}>
              <button
                type="button"
                id={`${id}-q${i}`}
                className={css.fBtn}
                aria-expanded={isOpen}
                aria-controls={`${id}-a${i}`}
                onClick={() => setOpen(isOpen ? -1 : i)}
              >
                {q}
                <span className={css.plus} aria-hidden="true" />
              </button>
            </h3>
            <div id={`${id}-a${i}`} role="region" aria-labelledby={`${id}-q${i}`} className={css.fPanel} data-open={isOpen || undefined}>
              <div>
                <p>{a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
