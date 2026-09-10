"use client";

import { useRef, useState } from "react";
import Link from "next/link";

type Campus = {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  buildings: number;
  rooms: number;
};

export default function CampusDirectory({ schools }: { schools: Campus[] }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const results = schools.map((school, index) => ({ ...school, index }))
    .filter(school => terms.every(term => `${school.name} ${school.city ?? ""} ${school.state ?? ""}`.toLowerCase().includes(term)));

  return (
    <>
      <div className="dm-directory-filter">
        <div className="dm-directory-search">
          <label htmlFor="campus-search">Find your school</label>
          <div>
            <input ref={input} id="campus-search" type="search" value={query}
              placeholder="School, city, or state" autoComplete="off"
              aria-controls="campus-results" onChange={event => setQuery(event.target.value)} />
            {query && <button type="button" onClick={() => { setQuery(""); input.current?.focus(); }}>Clear</button>}
          </div>
        </div>
        <p role="status">{results.length} of {schools.length} schools</p>
      </div>
      <ul id="campus-results" className="dm-campus-grid mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map(school => (
          <li key={school.id}>
            <Link href={`/colleges/${school.id}`} className="dm-editorial-card block border border-ink/10 bg-card p-5 transition-colors hover:border-cobalt">
              <span className="dm-campus-index dm-eyebrow">{String(school.index + 1).padStart(2, "0")} / <span aria-hidden="true">↗</span></span>
              <h2 className="font-display text-lg font-bold tracking-tight">{school.name}</h2>
              <p className="mt-1 text-sm text-ink-soft">{[school.city, school.state].filter(Boolean).join(", ")}</p>
              <p className="mt-3 font-mono text-xs uppercase tracking-wide text-ink-soft">{school.buildings} buildings · {school.rooms} room types</p>
            </Link>
          </li>
        ))}
      </ul>
      {results.length === 0 && <div className="dm-directory-empty">
        <h2 className="font-display text-2xl">No schools found.</h2>
        <p>Try a shorter name, a city, or a state. You can also <Link href="/add-school">request your school</Link>.</p>
      </div>}
    </>
  );
}
