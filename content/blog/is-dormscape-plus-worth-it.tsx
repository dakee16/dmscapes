import type { BlogPost } from "./types";
import { Lead, H2, H3, P, Ul, Li, Callout, EndCTA, TextLink } from "@/components/blog/Prose";

function Body() {
  return (
    <>
      <Lead>
        Dormscape Plus is a one-time $7.99 upgrade, not a subscription. It unlocks
        all nine vibes and every premium tool (PDF and PNG export, the
        side-by-side comparison view, and priority school requests), and hands you
        five plan credits and five saves as two separate counters. Pro is $19.99
        once and drops the counters entirely: unlimited plans and saves,
        everything unlocked, forever. Whether either is worth it comes down to how
        many rooms you&rsquo;re planning and whether you want the locked vibes and
        tools. Here&rsquo;s the honest breakdown, including who should stay free.
      </Lead>

      <H2>What&rsquo;s free, and what it covers</H2>
      <P>
        Start here, because it matters. The core planner is free to use: real room
        dimensions for supported schools, five free vibes (Minimalist, Cozy,
        Preppy, Academia, and Y2K Cyber), budget-aware product picks with live
        links, the drag-and-drop 2D layout that fits to the inch, and a share link
        for any room. A free account includes one room plan and one saved design,
        enough to build a room end to end and see the whole thing. When you want
        to plan or save more, or you want the four extra vibes and the export,
        comparison, and priority tools, that&rsquo;s where the paid tiers come in.
      </P>

      <H2>What Plus unlocks</H2>
      <P>
        Plus opens up the whole toolkit. Four of these are permanent the moment
        you buy, and the fifth, the plan and save credits, is the one worth
        understanding.
      </P>

      <H3>1. All nine vibes</H3>
      <P>
        Five vibes are free. Plus adds four more, Gamer, Team Spirit, Retro, and
        Pastel, each a complete plan with its own products, palette, and layout.{" "}
        <strong>Worth it if</strong>{" "}your look is a battle station, game-day, 70s
        groovy, or soft pastel.{" "}
        <strong>Skip it if</strong>{" "}one of the five free vibes already fits you.
      </P>

      <H3>2. PDF and PNG export</H3>
      <P>
        Plus turns your picks into a clean, printable PDF with names, prices, and
        a total, and lets you save the room layout as an image for a doc or the
        group chat.{" "}
        <strong>Worth it if</strong>{" "}a parent is funding the run or you&rsquo;re
        splitting a list with a roommate.{" "}
        <strong>Skip it if</strong>{" "}you&rsquo;re shopping solo straight off the
        screen.
      </P>

      <H3>3. Side-by-side comparison view</H3>
      <P>
        This lines up two of your saved designs with their budgets, styles, and
        room details next to each other, so you can settle which one wins without
        flipping back and forth from memory. We wrote a whole guide on the method:{" "}
        <TextLink href="/blog/compare-two-dorm-room-designs">
          how to compare two dorm room designs side by side
        </TextLink>
        . <strong>Worth it if</strong>{" "}you keep going back and forth.{" "}
        <strong>Skip it if</strong>{" "}there&rsquo;s only ever been one contender.
      </P>

      <H3>4. Priority on add-my-school requests</H3>
      <P>
        If your school isn&rsquo;t in our dimensions database yet, Plus and Pro
        members jump to the front of the queue when we build the next batch.{" "}
        <strong>Worth it if</strong>{" "}your hall isn&rsquo;t supported and you want
        real numbers sooner.{" "}
        <strong>Skip it if</strong>{" "}your school is already{" "}
        <TextLink href="/colleges">on the list</TextLink>.
      </P>

      <H3>5. Five plan credits and five saves (and how they work)</H3>
      <P>
        This is the one bit of the model worth spelling out. Plus meters two
        things on two separate counters: a plan credit is spent each time you
        generate a brand-new room plan, and a save credit is spent each time you
        save a design. Plus starts you with five of each, and they run down
        independently, you might have zero plans left but three saves, or the
        other way around. When either runs low, a single $4.99 recharge refills
        both at once, as many times as you want. Two things stay true no matter
        what: everything you&rsquo;ve already saved, exported, or compared keeps
        working even at zero credits, and the four features above never re-lock
        once you&rsquo;ve bought Plus.
      </P>

      <H2>When Pro makes sense</H2>
      <P>
        Pro is $19.99 once and removes the credit system entirely: unlimited room
        plans and unlimited saves, every vibe, every feature, nothing to recharge
        and no counter to watch.{" "}
        <strong>Worth it if</strong>{" "}you expect to plan more than a couple of
        rooms, you&rsquo;re helping friends plan theirs, or you just never want to
        think about credits.{" "}
        <strong>Skip it if</strong>{" "}a handful of plans is all you need; Plus plus
        the odd recharge is cheaper.
      </P>

      <H2>Who should skip both</H2>
      <P>
        We would rather you not spend the money than feel misled, so plainly: if
        one of the five free vibes fits, you&rsquo;re shopping off the screen,
        your school is already supported, and one room is really all you&rsquo;re
        planning, the free plan and save are all you need. Sharing is always free.
        You can always upgrade later if that changes.
      </P>

      <H2>The math</H2>
      <P>
        Plus is $7.99 once, recharges are $4.99 each, and Pro is $19.99 once. No
        renewals, no card kept on file after, no trial that quietly turns into a
        charge. See the full split on the{" "}
        <TextLink href="/pricing">pricing page</TextLink>.
      </P>

      <Callout label="The low-risk way to decide">
        <p>
          Don&rsquo;t buy anything first.{" "}
          <TextLink href="/plan">Plan a room for free</TextLink>, save it, and see
          how far free gets you. If you find yourself wanting a locked vibe, a PDF,
          or a side-by-side, that&rsquo;s your signal that Plus is worth it. If you
          expect to plan a lot of rooms, Pro is the flat unlock.
        </p>
      </Callout>

      <EndCTA cta="Plan a room for free first">
        The best way to know if a paid tier is worth it is to plan a room and find
        out.
      </EndCTA>
    </>
  );
}

const post: BlogPost = {
  slug: "is-dormscape-plus-worth-it",
  title: "Is Dormscape Plus worth it? Here's what you actually get",
  metaTitle: "Is Dormscape Plus Worth It? An Honest Breakdown",
  description:
    "An honest look at Dormscape Plus ($7.99 once: all vibes, PDF and PNG export, comparison, priority, and 5 plan credits plus 5 saves) and Pro ($19.99 for unlimited), plus who should stay on the free planner.",
  excerpt:
    "A specific, non-salesy breakdown of what Plus and Pro unlock, how the plan and save credits work, and who each tier actually helps, including the people who should stay free.",
  date: "2026-07-28",
  readingTimeMin: 6,
  faqTopic: "Plus",
  faqs: [
    {
      q: "How much is Dormscape Plus?",
      a: "Dormscape Plus is a one-time $7.99 payment, not a subscription. It grants 5 plan credits and 5 saves (two separate counters), unlocks all nine vibes, and unlocks every premium feature permanently. If either counter runs out you can recharge for $4.99, which refills both, as often as you like. Pro is a one-time $19.99 for unlimited plans and saves with everything unlocked.",
    },
    {
      q: "What does Dormscape Plus include?",
      a: "Plus unlocks all nine vibes (adding Gamer, Team Spirit, Retro, and Pastel), PDF and PNG export, the side-by-side comparison view, and priority handling on add-my-school requests. It also comes with 5 plan credits and 5 saves, tracked separately: one plan credit per new room plan, one save credit per saved design. A $4.99 recharge tops up both whenever you run low, and the premium features stay unlocked even at zero credits.",
    },
    {
      q: "Is the Dormscape planner still free?",
      a: "Yes, the core 2D planner is free to use: real room dimensions for supported schools, five free vibes, budget-aware product picks, the drag-and-drop layout, and share links. A free account includes one room plan and one saved design to try it end to end; Plus and Pro add more of both plus the premium tools.",
    },
    {
      q: "What is the difference between Plus and Pro?",
      a: "Plus is $7.99 and uses two credit counters: it starts you with 5 plan credits and 5 saves, and a $4.99 recharge refills both when they run out. Pro is $19.99 and has no counters at all, meaning unlimited plans and unlimited saves. Both unlock all nine vibes and every premium feature. Pro is the better value if you plan many rooms; Plus with the occasional recharge is cheaper for a few.",
    },
  ],
  Body,
};

export default post;
