import fs from "node:fs/promises";
import path from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CampusReview, { type Campus } from "./CampusReview";

// Dev-only map for reviewing Hall Finder campus data (scripts/campus/build.mjs output):
// drag hall pins, fix year tags, check walking paths. 404 in production.
export const metadata: Metadata = { title: "Campus review", robots: { index: false, follow: false } };

export default async function CampusReviewPage({ params }: { params: Promise<{ collegeId: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { collegeId } = await params;
  if (!/^[a-z0-9-]+$/.test(collegeId)) notFound();
  const campus: Campus | null = await fs
    .readFile(path.join(process.cwd(), "data", "campus", `${collegeId}.json`), "utf8")
    .then(JSON.parse)
    .catch(() => null);
  if (!campus) notFound();
  return <CampusReview campus={campus} />;
}
