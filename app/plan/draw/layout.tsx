import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";

// The draw page is a client component, so its metadata lives here.
export const metadata: Metadata = {
  ...pageMetadata({
    title: "Draw Your Dorm Room Floor Plan",
    description:
      "Draw your dorm room's walls on a grid, add doors and windows, then choose a vibe and get a furniture layout and shopping list that fit your exact room.",
    path: "/plan/draw",
  }),
  // Restates the template for /plan/draw/3d (see app/plan/layout.tsx).
  title: { absolute: "Draw Your Dorm Room Floor Plan | dormscape", template: "%s | dormscape" },
};

export default function DrawLayout({ children }: { children: React.ReactNode }) {
  return children;
}
