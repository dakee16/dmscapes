import type { BlogPost } from "./types";
import { Lead, H2, H3, P, Ul, Li, Callout, EndCTA, TextLink } from "@/components/blog/Prose";

function Body() {
  return (
    <>
      <Lead>
        Dormscape Plus is a one-time $4.99 upgrade, not a subscription. It
        unlocks five things: unlimited saved designs, four exclusive design
        styles, a PDF export of your shopping list, a side-by-side comparison
        view, and priority on add-my-school requests. Whether it&rsquo;s worth it
        comes down to one
        question: are you weighing more than one version of your room? If you
        are, Plus earns the five dollars. If you&rsquo;ve already settled on a
        single look, the free planner does everything you need. Here&rsquo;s the
        honest breakdown, including who should skip it.
      </Lead>

      <H2>What&rsquo;s free, and what stays free</H2>
      <P>
        Start here, because it matters. The core planner is free and stays free.
        That means real room dimensions for supported schools, six free styles
        (Minimalist, Cozy, Boho, Preppy, Academia, and Y2K Cyber), budget-aware
        product picks with live links, the drag-and-drop 2D layout that fits to
        the inch, one saved design, and a share link for any room. Plus never
        locks a single one of those. It only adds on top, so upgrading is a
        choice about extras, never a ransom on the basics.
      </P>

      <H2>The five things Plus unlocks</H2>
      <P>
        Five features. Most of them point at the same person: someone weighing
        options rather than committing to the first idea. One just hands you more
        looks to choose from.
      </P>

      <H3>1. Unlimited saved designs</H3>
      <P>
        Free saves one design. Plus lets you keep every version you&rsquo;re
        weighing, a cozy build and a minimalist one, or the same style at two
        budgets, so you can sit with them instead of picking under pressure.{" "}
        <strong>Worth it if</strong>{" "}you&rsquo;re torn between looks or budgets.{" "}
        <strong>Skip it if</strong>{" "}you already know exactly what you want and one
        saved room is plenty.
      </P>

      <H3>2. Four exclusive design styles</H3>
      <P>
        Six styles are free. Plus adds four more, Gamer, Team Spirit, Retro, and
        Pastel, each a complete plan with its own products, palette, and layout.{" "}
        <strong>Worth it if</strong>{" "}your look is a battle station, game-day, 70s
        groovy, or soft pastel.{" "}
        <strong>Skip it if</strong>{" "}one of the six free styles already fits you.
      </P>

      <H3>3. PDF export of your shopping list</H3>
      <P>
        Plus turns your picks into a clean, printable PDF with names, prices, and
        a total. It&rsquo;s the thing you send the person actually paying, or
        bring to a group order so nobody buys the same lamp twice.{" "}
        <strong>Worth it if</strong>{" "}a parent is funding the run or you&rsquo;re
        splitting a list with a roommate.{" "}
        <strong>Skip it if</strong>{" "}you&rsquo;re shopping solo straight off the
        screen.
      </P>

      <H3>4. Side-by-side comparison view</H3>
      <P>
        This lines up two saved designs with their budgets, styles, and room
        details next to each other, so you can settle which one wins without
        flipping back and forth from memory. If you&rsquo;re genuinely stuck
        between two, this is the feature that breaks the tie. We wrote a whole
        guide on the method:{" "}
        <TextLink href="/blog/compare-two-dorm-room-designs">
          how to compare two dorm room designs side by side
        </TextLink>
        . <strong>Worth it if</strong>{" "}you keep going back and forth.{" "}
        <strong>Skip it if</strong>{" "}there&rsquo;s only ever been one contender.
      </P>

      <H3>5. Priority on add-my-school requests</H3>
      <P>
        If your school isn&rsquo;t in our dimensions database yet, Plus members
        jump to the front of the queue when we build the next batch.{" "}
        <strong>Worth it if</strong>{" "}your hall isn&rsquo;t supported and you want
        real numbers sooner.{" "}
        <strong>Skip it if</strong>{" "}your school is already{" "}
        <TextLink href="/colleges">on the list</TextLink>, since you already have
        the exact dimensions.
      </P>

      <H2>Who should skip Plus</H2>
      <P>
        We would rather you not spend the five dollars than feel misled, so plainly:
        if you&rsquo;ve picked one style, you&rsquo;re working to one budget, your
        school is already supported, and you&rsquo;re happy shopping off the
        screen, the free planner is all of it. You lose nothing by staying free,
        and you can always upgrade later if that changes.
      </P>

      <H2>Who Plus is actually for</H2>
      <Ul>
        <Li>
          <strong>The good kind of indecisive.</strong>{" "}You want to save a few
          versions and compare them properly before you commit.
        </Li>
        <Li>
          <strong>The parent-funded shopper.</strong>{" "}Someone else is paying, and
          a tidy PDF with a total is easier than a wall of tabs.
        </Li>
        <Li>
          <strong>The roommate pair.</strong>{" "}You&rsquo;re splitting a room and a
          budget and want two lists that don&rsquo;t collide.
        </Li>
      </Ul>

      <H2>The math</H2>
      <P>
        It&rsquo;s $4.99 once. No renewal, no card kept on file after, no trial
        that quietly turns into a charge. That&rsquo;s less than one impulse dorm
        buy you end up returning, and it applies to your account the moment
        payment clears. See the full split on the{" "}
        <TextLink href="/pricing">pricing page</TextLink>.
      </P>

      <Callout label="The low-risk way to decide">
        <p>
          Don&rsquo;t buy it first.{" "}
          <TextLink href="/plan">Plan a room for free</TextLink>, save it, and see
          how far the free tier gets you. If you hit the one-save wall or you find
          yourself wanting to line two rooms up, that&rsquo;s your signal that Plus
          is worth it for you. If you never do, you saved five dollars and a
          coffee.
        </p>
      </Callout>

      <EndCTA cta="Plan a room for free first">
        The best way to know if Plus is worth it is to plan a room and find out.
      </EndCTA>
    </>
  );
}

const post: BlogPost = {
  slug: "is-dormscape-plus-worth-it",
  title: "Is Dormscape Plus worth it? Here's what you actually get",
  metaTitle: "Is Dormscape Plus Worth It? An Honest Breakdown",
  description:
    "An honest look at Dormscape Plus, a one-time $4.99 upgrade: unlimited saves, four exclusive styles, PDF export, side-by-side comparison, and priority school requests, plus who should skip it.",
  excerpt:
    "A specific, non-salesy breakdown of the five Plus features and who each one actually helps, including the people who should stay on the free planner.",
  date: "2026-07-28",
  readingTimeMin: 6,
  faqTopic: "Plus",
  faqs: [
    {
      q: "How much is Dormscape Plus?",
      a: "Dormscape Plus is a one-time $4.99 payment, not a subscription. There is no renewal and no card kept on file after the purchase. It applies to your account as soon as the payment clears.",
    },
    {
      q: "What does Dormscape Plus include?",
      a: "Plus unlocks five things on top of the free planner: unlimited saved designs, four exclusive design styles (Gamer, Team Spirit, Retro, and Pastel), a PDF export of your shopping list, a side-by-side comparison view for two saved designs, and priority handling on add-my-school requests.",
    },
    {
      q: "Is the Dormscape planner still free?",
      a: "Yes. The core 2D planner is free and stays free, including real room dimensions for supported schools, six free styles, budget-aware product picks, the drag-and-drop layout, one saved design, and share links. Plus only adds extras and never locks free features.",
    },
    {
      q: "Do I need Dormscape Plus to plan a dorm room?",
      a: "No. You can plan, style, and shop a complete room for free without an account, using any of the six free styles. Plus is worth considering only if you want the four Plus styles, to save more than one design, export a PDF, compare two rooms side by side, or fast-track a school request.",
    },
  ],
  Body,
};

export default post;
