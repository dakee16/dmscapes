import type { Metadata } from "next";
import Nav from "@/components/Nav";
import ThankYouView from "./ThankYouView";

export const metadata: Metadata = {
  title: "Thank you",
  description: "Your dorm room is handled. Thanks for planning with Dormscape.",
  robots: { index: false }, // a post-purchase moment, not a landing page
};

export default function ThankYouPage() {
  return (
    <div className="relative min-h-screen">
      <Nav />
      {/* Graph-paper wash behind the top, same treatment as the planner steps */}
      <div
        className="grid-paper grid-paper-fade pointer-events-none absolute inset-x-0 top-16 -z-10 h-80"
        aria-hidden="true"
      />
      <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
        <ThankYouView />
      </main>
    </div>
  );
}
