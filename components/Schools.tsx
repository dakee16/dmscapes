import Link from "next/link";
import Reveal from "@/components/site/Reveal";

const SCHOOLS = [
  { name: "University of Michigan", hall: "Mosher-Jordan", dims: "15'6\" × 12'0\"" },
  { name: "Ohio State", hall: "Morrill Tower", dims: "14'2\" × 11'8\"" },
  { name: "Penn State", hall: "East Halls", dims: "12'10\" × 11'6\"" },
  { name: "NYU", hall: "Rubin Hall", dims: "13'4\" × 10'2\"" },
  { name: "Rutgers", hall: "Brett Hall", dims: "16'0\" × 12'0\"" },
  { name: "UT Austin", hall: "Jester Center", dims: "13'0\" × 11'4\"" },
  { name: "University of Georgia", hall: "Creswell Hall", dims: "12'6\" × 11'10\"" },
  { name: "Alabama", hall: "Tutwiler Hall", dims: "12'3\" × 12'0\"" },
  { name: "UCLA", hall: "Sproul Hall", dims: "13'6\" × 10'8\"" },
  { name: "Georgia Tech", hall: "Armstrong", dims: "15'0\" × 11'0\"" },
  { name: "Wisconsin", hall: "Sellery Hall", dims: "16'5\" × 12'0\"" },
  { name: "Purdue", hall: "Cary Quadrangle", dims: "16'0\" × 14'0\"" },
];

export default function Schools() {
  return (
    <section id="schools" className="mx-auto max-w-6xl px-5 py-20 sm:px-8 sm:py-28">
      <Reveal stagger>
        <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-cobalt">
          Supported schools
        </p>
        <h2 className="mt-3 max-w-xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
          We already know your room
        </h2>
        <p className="mt-4 max-w-lg text-[15px] leading-relaxed text-ink-soft">
          Floor plans and dimensions sourced from official housing documents.
          A few of them:
        </p>
      </Reveal>

      <Reveal>
        <ul className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {SCHOOLS.map((s) => (
          <li
            key={s.name}
            className="flex items-center justify-between gap-3 rounded-xl border border-ink/10 bg-white px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{s.name}</p>
              <p className="truncate text-xs text-ink-soft">{s.hall}</p>
            </div>
            <span className="shrink-0 font-mono text-[11px] font-medium text-cobalt">
              {s.dims}
            </span>
          </li>
        ))}
        </ul>

        <div className="mt-8 flex flex-col items-start gap-3 rounded-xl border border-dashed border-ink/25 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-soft">
            <span className="font-semibold text-ink">Don&apos;t see your school?</span>{" "}
            Tell us and we&apos;ll add its floor plans.
          </p>
          <Link
            href="/add-school"
            className="rounded-lg border border-ink px-4 py-2 text-sm font-semibold text-ink transition-colors hover:bg-ink hover:text-white"
          >
            Add my school
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
