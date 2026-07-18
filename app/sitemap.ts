import type { MetadataRoute } from "next";
import { SCHOOLS } from "@/lib/schools";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://dormscape.us";

export default function sitemap(): MetadataRoute.Sitemap {
  const statics: MetadataRoute.Sitemap = [
    { url: `${BASE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/plan`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${BASE}/colleges`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE}/add-school`, changeFrequency: "monthly", priority: 0.5 },
  ];
  const colleges: MetadataRoute.Sitemap = SCHOOLS.map((s) => ({
    url: `${BASE}/colleges/${s.id}`,
    changeFrequency: "monthly",
    priority: 0.8,
  }));
  return [...statics, ...colleges];
}
