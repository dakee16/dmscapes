import type { Metadata } from "next";
import SiteHeader from "@/components/site/SiteHeader";
import ThankYouView from "./ThankYouView";

export const metadata: Metadata = {
  title: "Thank you",
  description: "Your dorm room is handled. Thanks for planning with Dormscape.",
  robots: { index: false }, // a post-purchase moment, not a landing page
};

export default function ThankYouPage() {
  return (
    <div className="relative min-h-screen">
      <SiteHeader gridClassName="h-80" />
      <main className="mx-auto w-full max-w-xl px-5 pb-24 pt-10 sm:px-8 sm:pt-14">
        <ThankYouView />
      </main>
    </div>
  );
}
