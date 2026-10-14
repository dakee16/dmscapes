"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CollegeSearch from "@/components/planner/CollegeSearch";
import { searchSchools } from "@/lib/schools";
import type { SchoolSummary } from "@/lib/types";
import { ArrowRight } from "@/components/ds/Icons";
import { replyToAgent } from "@/lib/webmcp";
import css from "./Home.module.css";

/**
 * Hero search: pick a college and land on /plan with its dorm list open
 * (the existing ?school= deep link). Same logic as components/site/HeroSearch.
 */
export default function HomeSearch() {
  const router = useRouter();
  const [picked, setPicked] = useState<SchoolSummary | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("college-search") as HTMLInputElement | null;
    const text = input?.value.trim() ?? "";
    const school = picked && picked.name === text ? picked : text ? searchSchools(text)[0] : undefined;
    replyToAgent(e, school ? `Opened the dormscape planner for ${school.name}.` : "No college matched, so the planner opened on its college list.");
    router.push(school ? `/plan?school=${encodeURIComponent(school.id)}` : "/plan");
  }

  return (
    <form
      role="search"
      className={css.search}
      onSubmit={submit}
      toolname="plan_dorm_room"
      tooldescription="Open the free dormscape dorm room planner on a college, with its residence halls and real room dimensions ready to plan."
      toolautosubmit=""
    >
      <div className={css.searchField}>
        <CollegeSearch
          selectedName={null}
          onSelect={setPicked}
          onNoMatches={() => router.push("/add-school")}
          placeholder="Search your college"
        />
      </div>
      <button type="submit" className="ds-btn ds-btn--blue">
        Plan my room free
        <ArrowRight />
      </button>
    </form>
  );
}
