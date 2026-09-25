"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import CollegeSearch from "@/components/planner/CollegeSearch";
import { searchSchools } from "@/lib/schools";
import type { SchoolSummary } from "@/lib/types";

/** Hero shortcut into Step 1: pick a college here, land on /plan with its dorm
 *  list open (via the existing ?school= deep link). */
export default function HeroSearch() {
  const router = useRouter();
  const [picked, setPicked] = useState<SchoolSummary | null>(null);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("college-search") as HTMLInputElement | null;
    const text = input?.value.trim() ?? "";
    // Typed past the last pick? Fall back to the best match for what's in the box.
    const school = picked && picked.name === text ? picked : text ? searchSchools(text)[0] : undefined;
    router.push(school ? `/plan?school=${encodeURIComponent(school.id)}` : "/plan");
  }

  return (
    <form role="search" className="dm-hero-search" onSubmit={submit}>
      <CollegeSearch
        selectedName={null}
        onSelect={setPicked}
        onNoMatches={() => router.push("/add-school")}
        placeholder="Find your dorm"
      />
      <button type="submit">Search</button>
    </form>
  );
}
