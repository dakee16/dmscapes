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
        Free lets you try it with 1 room plan you can save, plus 3 vibes and
        share links. Plus ($4.99 once) unlocks all 9 vibes, PDF and PNG export,
        side-by-side comparison, and priority school requests, and gives you 5
        plan credits (recharge 5 more for $2.99). Pro ($14.99 once) is that same
        unlock with unlimited plans. Saving your designs is always free. See the
        full split on the{" "}
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
    q: "What if my school or room isn't listed, or my room is an odd shape?",
    a: (
      <>
        Draw it. <span className="font-semibold text-ink">Draw your own room</span>{" "}
        (a Plus feature) lets you trace your exact floor plan, even an L-shape, and
        drop in the door, windows, and closets. We place furniture against your
        real walls and hand back the same layout and shoppable list as a listed
        room, and you can save the room and reuse it for other designs. More on the{" "}
        <Link
          href="/blog/design-your-own-dorm-room"
          className="font-semibold text-cobalt underline decoration-highlight decoration-2 underline-offset-2 transition-colors hover:text-cobalt-deep"
        >
          drawing tool
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
        cost to you. That commission helps keep the planner free to try.
      </>
    ),
  },
  {
    q: "Will you add more schools?",
    a: (
      <>
        Yes. We&rsquo;ve mapped 1,500+ dorm layouts with real dimensions and keep
        adding more. If yours isn&rsquo;t listed, request it from the planner and
        we&rsquo;ll pull its floor plans into the queue. Plus and Pro requests jump
        the line.
      </>
    ),
  },
  {
    q: "What happens when my Plus credits run out?",
    a: (
      <>
        Only new room plans use credits. Saving stays free, and your existing
        designs, exports, and comparisons keep working. A $2.99 recharge adds
        five more plan credits, or go Pro for unlimited plans.
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
    <div className="dm-home-faq">
      <div className="dm-faq-items">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <div key={f.q} className="dm-faq-item">
              <h3>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : i)}
                  id={`home-faq-question-${i}`}
                  aria-controls={`home-faq-answer-${i}`}
                  aria-expanded={isOpen}
                  className="dm-faq-question flex w-full cursor-pointer items-center justify-between gap-5 text-left"
                >
                  <span
                    className={`font-sans text-base font-semibold leading-relaxed transition-colors sm:text-lg ${
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
                id={`home-faq-answer-${i}`}
                role="region"
                aria-labelledby={`home-faq-question-${i}`}
                aria-hidden={!isOpen}
                inert={!isOpen}
                className={`dm-faq-answer grid transition-[grid-template-rows] duration-300 ease-out motion-reduce:transition-none ${
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <p
                    className={`pb-6 pr-10 text-[15px] leading-relaxed text-ink-soft transition-opacity duration-300 motion-reduce:transition-none ${
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
