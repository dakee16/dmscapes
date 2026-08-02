"use client";

import { useState } from "react";
import Link from "next/link";

// Homepage FAQ accordion. Curated, product-level questions consolidated from
// what's established across the site (dimensions, accounts, tiers, the affiliate
// model, schools, credits). The full dorm-advice FAQ and its structured data
// live on /faq; this stays schema-free so there's no duplicate FAQPage markup.
const FAQS: { q: string; a: React.ReactNode }[] = [
  {
    q: "How accurate are the room dimensions?",
    a: (
      <>
        For supported schools they come from real floor plans and published
        housing data, down to the foot. When a specific room isn&rsquo;t on file
        we fall back to the closest match and label it an estimate, so you always
        know what you&rsquo;re looking at. Either way, you can nudge any
        measurement by hand.
      </>
    ),
  },
  {
    q: "Do I need an account to use the planner?",
    a: (
      <>
        No. Pick your school, choose a vibe, set a budget, and get a full room
        plan with a shoppable list without signing up. A free account only comes
        in when you want to save designs to a library or upgrade.
      </>
    ),
  },
  {
    q: "What's the difference between Free, Plus, and Pro?",
    a: (
      <>
        Free lets you try it with 1 room plan and 1 saved design, plus 5 vibes and
        share links. Plus ($7.99 once) unlocks all 9 vibes, PDF and PNG export,
        side-by-side comparison, and priority school requests, and gives you 5
        plan credits and 5 saves as two separate counters (recharge both for
        $4.99). Pro ($19.99 once) is that same unlock with unlimited plans and
        saves. See the full split on the{" "}
        <Link
          href="/pricing"
          className="font-semibold text-cobalt underline decoration-highlight decoration-2 underline-offset-2 transition-colors hover:text-cobalt-deep"
        >
          pricing page
        </Link>
        .
      </>
    ),
  },
  {
    q: "How do the Amazon links work? Is this an ad?",
    a: (
      <>
        Every product is a real Amazon listing, and the links are affiliate
        links: buy through one and Amazon pays us a small commission at no extra
        cost to you. That commission is the entire business model, and it&rsquo;s
        what keeps the planner free.
      </>
    ),
  },
  {
    q: "Will you add more schools?",
    a: (
      <>
        Yes. We&rsquo;re at 16 schools with real dimensions and adding more. If
        yours isn&rsquo;t listed, request it from the planner and we&rsquo;ll pull
        its floor plans into the queue. Plus and Pro requests jump the line.
      </>
    ),
  },
  {
    q: "What happens when my Plus credits run out?",
    a: (
      <>
        Plans and saves are metered separately, so only the one you&rsquo;ve used
        up pauses. Say you&rsquo;re out of plan credits but still have saves, you
        can keep saving, and vice versa. Everything you&rsquo;ve already made
        keeps working, exports and comparison included. A $4.99 recharge refills
        both counters, or go Pro for unlimited.
      </>
    ),
  },
];

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function HomeFaq() {
  // Single-open: tapping a question closes whichever was open.
  const [open, setOpen] = useState<number | null>(null);

  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-card shadow-[0_24px_60px_-40px_rgba(23,23,43,0.4)]">
      <div className="divide-y divide-ink/8">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q}>
              <h3>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-5 text-left transition-colors hover:bg-paper/60 sm:px-6"
                >
                  <span
                    className={`font-display text-[17px] font-bold leading-snug tracking-tight transition-colors sm:text-lg ${
                      isOpen ? "text-cobalt" : "text-ink"
                    }`}
                  >
                    {f.q}
                  </span>
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-300 motion-reduce:transition-none ${
                      isOpen
                        ? "rotate-180 border-cobalt/30 bg-cobalt/[0.06] text-cobalt"
                        : "border-ink/15 text-ink-soft"
                    }`}
                  >
                    <Chevron />
                  </span>
                </button>
              </h3>
              {/* Collapsible answer: grid-rows 0fr -> 1fr animates to auto height
                  smoothly, no measured max-height guesswork. */}
              <div
                className={`grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p
                    className={`px-5 pb-6 text-[15px] leading-relaxed text-ink-soft transition-opacity duration-300 motion-reduce:transition-none sm:px-6 ${
                      isOpen ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {f.a}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
