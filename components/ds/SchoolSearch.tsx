"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CollegeSearch from "@/components/planner/CollegeSearch";
import { searchSchools } from "@/lib/schools";
import type { SchoolSummary } from "@/lib/types";
import { ArrowRight } from "./Icons";
import css from "./SchoolSearch.module.css";

/**
 * The white pill search used in heroes. `to="plan"` opens the planner on the
 * school (/plan?school=); `to="college"` opens the school's page.
 */
export default function SchoolSearch({
  to = "plan",
  button = "Plan my room free",
  placeholder = "Search your college",
  tone = "blue",
}: {
  to?: "plan" | "college";
  button?: string;
  placeholder?: string;
  tone?: "blue" | "ink";
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<SchoolSummary | null>(null);
  const href = (s: SchoolSummary) =>
    to === "plan" ? `/plan?school=${encodeURIComponent(s.id)}` : `/colleges/${s.id}`;

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("college-search") as HTMLInputElement | null;
    const text = input?.value.trim() ?? "";
    const school = picked && picked.name === text ? picked : text ? searchSchools(text)[0] : undefined;
    if (school) router.push(href(school));
    else router.push(to === "plan" ? "/plan" : "/add-school");
  }

  return (
    <form role="search" className={css.search} onSubmit={submit}>
      <div className={css.field}>
        <CollegeSearch
          selectedName={null}
          onSelect={(s) => {
            setPicked(s);
            if (to === "college") router.push(href(s));
          }}
          onNoMatches={() => router.push("/add-school")}
          placeholder={placeholder}
        />
      </div>
      <button type="submit" className={`ds-btn ${tone === "ink" ? "ds-btn--ink-yellow" : "ds-btn--blue"}`}>
        {button}
        <ArrowRight />
      </button>
    </form>
  );
}
