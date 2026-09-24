import type { BlogPost } from "./types";
import { Lead, H2, H3, P, Ul, Li, Callout, EndCTA, TextLink } from "@/components/blog/Prose";

function Body() {
  return (
    <>
      <Lead>Dormscape Plus is a one-time $4.99 upgrade with five room-plan credits, all nine preset vibes, 2D drawing, product imports, exports, comparison, and priority school requests. Saving designs is always free. Pro is $14.99 once and adds unlimited room plans, create your own vibe, 3D Room Builder, and live 3D Room Studio. Choose based on the tools you want and the number of plans you expect to generate.</Lead>

      <H2>What&rsquo;s free, and what it covers</H2>
      <P>
        Start here, because it matters. The core planner is free to use: real room
        dimensions for supported schools, three free vibes (Minimalist, Cozy,
        and Preppy), budget-aware product picks with live
        links, the drag-and-drop 2D layout that fits to the inch, and a share link
        for any room. A free account includes one room plan and unlimited saving,
        enough to build a room end to end and see the whole thing. When you want
        to generate more plans, or you want the six extra vibes and the export,
        comparison, and priority tools, that&rsquo;s where the paid tiers come in.
      </P>

      <H2>What Plus unlocks</H2>
      <P>
        Plus adds permanent 2D tools and a pack of plan credits. Pro includes those tools and adds 3D room building, live 3D planning, and custom vibes.
      </P>

      <H3>1. All nine vibes</H3>
      <P>
        Three vibes are free. Plus adds six more, Academia, Y2K Cyber, Gamer,
        Team Spirit, Retro, and Pastel, each a complete plan with its own
        products, palette, and layout.{" "}
        <strong>Worth it if</strong>{" "}your look is a battle station, game-day, 70s
        groovy, or soft pastel.{" "}
        <strong>Skip it if</strong>{" "}one of the three free vibes already fits you.
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

      <H3>5. Five plan credits, free saving</H3><P>One plan credit is used when you generate a new room plan. Saving a design does not use a credit. Plus starts with five plan credits; a $2.99 recharge adds five more. Saved designs and unlocked Plus tools remain available when your plan credits run out.</P>
      <H2>When Pro makes sense</H2>
      <P>
        Pro is $14.99 once and removes the credit system entirely: unlimited room
        plans, create your own vibe, 3D Room Builder, and live 3D Room Studio. The{" "}
        <TextLink href="/plan/draw/3d">3D builder</TextLink> lets you place a floor, shape walls, and add doors and windows before furnishing the room. Saving stays free for every account. Pro includes all Plus features, with nothing to recharge
        and no counter to watch.{" "}
        <strong>Worth it if</strong>{" "}you want to build or explore your room in 3D, expect to plan more than a couple of
        rooms, you&rsquo;re helping friends plan theirs, or you just never want to
        think about credits.{" "}
        <strong>Skip it if</strong>{" "}2D planning and a handful of plans are all you need; Plus plus
        the odd recharge is cheaper.
      </P>

      <H2>Who should skip both</H2>
      <P>
        We would rather you not spend the money than feel misled, so plainly: if
        one of the three free vibes fits, you&rsquo;re shopping off the screen,
        your school is already supported, and one room is really all you&rsquo;re
        planning, the free plan and save are all you need. Sharing is always free.
        You can always upgrade later if that changes.
      </P>

      <H2>The math</H2>
      <P>
        Plus is $4.99 once, recharges are $2.99 each, and Pro is $14.99 once. There is no subscription to renew. See the full split on the{" "}
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
    "Compare Dormscape Plus and Pro: plan credits, 2D tools, custom vibes, 3D Room Builder, and live 3D planning. Find the tools you need before upgrading.",
  excerpt:
    "A specific, non-salesy breakdown of what Plus and Pro unlock, how plan credits and free saving work, and who each tier actually helps, including the people who should stay free.",
  date: "2026-07-28",
  updated: "2026-09-24",
  readingTimeMin: 6,
  faqTopic: "Plus",
  faqs: [
    {q:"How much is Dormscape Plus?",a:"Plus is $4.99 once with five room-plan credits. A $2.99 recharge adds five more plan credits. Saving is always free and unlimited. Pro is $14.99 once for unlimited room plans, custom vibes, 3D Room Builder, and live 3D Room Studio."},
    {q:"What does Dormscape Plus include?",a:"Plus includes all nine preset vibes, 2D room drawing, importing Amazon products, PDF and PNG export, comparison, priority school requests, and five plan credits. 3D room building, live 3D planning, and create your own vibe require Pro."},
    {q:"Is the Dormscape planner still free?",a:"Yes. Free includes one room plan, three preset vibes, the 2D editor, shopping links, sharing, and unlimited saving with an account. Interactive 3D is included with Pro."},
    {q:"What is the difference between Plus and Pro?",a:"Plus has five initial plan credits and permanent Plus tools. Pro includes all Plus tools, unlimited plans, 3D Room Builder, live 3D Room Studio, and create your own vibe. Saving is free for every account."}
  ],
  Body,
};

export default post;
