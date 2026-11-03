import { shortDate } from "@/components/blog/topics";
import type { Source } from "@/lib/school-facts";
import css from "./College.module.css";

/** "Published room sizes from housing.ucla.edu, collected Jul 14, 2026." Links the school's own page. */
export default function SourceLine({ source, what }: { source: Source; what: string }) {
  return (
    <p className={css.source}>
      {what} from{" "}
      <a href={source.url} className="ds-link" target="_blank" rel="noopener">
        {source.host}
      </a>
      {source.collected && (
        <>
          , collected <time dateTime={source.collected}>{shortDate(source.collected)}</time>
        </>
      )}
      .
    </p>
  );
}
