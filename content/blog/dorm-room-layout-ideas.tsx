import type { BlogPost } from "./types";
import { Lead, H2, P, Ul, Li, Callout, EndCTA, TextLink } from "@/components/blog/Prose";

function Body() {
  return (
    <>
      <Lead>
        There are only a handful of dorm layouts that actually work, because
        every dorm room is the same puzzle: two or three fixed pieces of
        furniture per person, one door, one window, and not much floor. The trick
        is not finding a clever new arrangement. It is picking the pattern that
        matches the shape of your room and what you care about most: privacy,
        floor space, or storage.
      </Lead>

      <H2>1. Beds on opposite walls (the privacy layout)</H2>
      <P>
        Each bed against its own long wall, desks at the foot or under the
        window, dressers filling the gaps. This is the default for a reason: it
        gives each roommate a defined side, and the middle stays open as shared
        floor.
      </P>
      <P>
        Best in rooms wide enough that two beds plus a walkway fit across, which
        usually means about eleven feet or more of width. Below that the middle
        aisle gets too tight to use.
      </P>

      <H2>2. Beds parallel on one wall (the open-floor layout)</H2>
      <P>
        Both beds along the same wall, headboards in line, with desks and
        dressers opposite. You trade a little privacy for one continuous stretch
        of open floor, which is what makes a room feel bigger and gives a rug
        somewhere real to go.
      </P>
      <P>
        Best in long, narrow rooms where a bed on each side would leave a
        corridor instead of a room.
      </P>

      <H2>3. Lofted beds over desks (the storage layout)</H2>
      <P>
        Raise both beds and put the desks, dressers, or storage underneath. This
        is the biggest single win in a small room: it roughly gives you the floor
        area of the bed back. Check two things before committing: your school has
        to allow lofting, and you need the real clearance height under the loft,
        because desks and drawer units are taller than people estimate.
      </P>

      <H2>4. The L (the corner layout)</H2>
      <P>
        Bed along one wall, desk along the adjacent wall, meeting at a corner.
        It clusters furniture into two sides and leaves the other two clear,
        which suits single rooms and any room with an awkward door swing or
        radiator you need to keep clear.
      </P>

      <H2>What actually decides which one works</H2>
      <Ul>
        <Li>
          <span className="font-semibold text-ink">Walkways.</span> Keep about two
          and a half feet for any path you use daily. Most layouts fail here
          first, not on whether the furniture technically fits.
        </Li>
        <Li>
          <span className="font-semibold text-ink">The door swing.</span> A door
          opening inward eats a quarter circle of floor that nothing can occupy.
        </Li>
        <Li>
          <span className="font-semibold text-ink">The window.</span> Desks near
          natural light are worth more than desks near outlets. You can move an
          outlet with a power strip.
        </Li>
        <Li>
          <span className="font-semibold text-ink">The rug.</span> Buy the rug
          last and to the open floor you actually end up with. A rug that has to
          slide under furniture is the wrong rug.
        </Li>
      </Ul>

      <H2>Try them against your real room</H2>
      <P>
        Every one of these looks fine on paper and only one or two will fit your
        specific room. The fastest way to know is to lay them out against your
        actual dimensions, which you can usually get from your school. See{" "}
        <TextLink href="/blog/how-to-plan-a-college-dorm-room">
          how to plan a college dorm room
        </TextLink>{" "}
        for the full order of operations, and{" "}
        <TextLink href="/blog/small-dorm-room-ideas-that-work">
          small dorm room ideas
        </TextLink>{" "}
        if your room is on the tight end.
      </P>

      <Callout label="See it in your room, not in theory">
        <p>
          Dormscape lays these out against your building&rsquo;s real dimensions.{" "}
          <TextLink href="/colleges">Find your residence hall</TextLink>, get a
          layout that fits, then drag anything you want to move. Free.
        </p>
      </Callout>

      <EndCTA>Pick the layout your room can actually hold.</EndCTA>
    </>
  );
}

const post: BlogPost = {
  slug: "dorm-room-layout-ideas",
  title: "Dorm room layout ideas that actually fit",
  metaTitle: "Dorm Room Layout Ideas That Actually Fit",
  description:
    "Four dorm room layouts that work (opposite walls, parallel beds, lofted, and the L), when to use each, and the clearances that decide whether one fits your room.",
  excerpt:
    "There are only a handful of dorm layouts that work. Here they are, what each one trades away, and how to tell which fits your room.",
  date: "2026-08-31",
  readingTimeMin: 5,
  faqTopic: "Dorm room layouts",
  faqs: [
    {
      q: "What are the best dorm room layouts?",
      a: "Four patterns cover almost every dorm room: beds on opposite walls (most privacy), beds parallel along one wall (most open floor), lofted beds with desks underneath (most storage), and an L arrangement in a corner (best for singles or awkward door swings). Which one works depends on your room's width and where the door and window are.",
    },
    {
      q: "How do I make a dorm room feel bigger?",
      a: "Consolidate the furniture along fewer walls so the open floor is one continuous area rather than several small gaps, and loft the beds if your school allows it. Lofting gives back roughly the floor area of the bed, which is the single largest gain available in a small room.",
    },
    {
      q: "How much walkway space should a dorm layout leave?",
      a: "About two and a half feet for any path you walk daily. Most layouts fail on walkways rather than on whether the furniture technically fits, so check the gaps between pieces before you commit to an arrangement.",
    },
    {
      q: "Should I arrange dorm furniture before buying anything?",
      a: "Yes. The bed, desk, chair, and dresser are already in the room and fixed in size, so arranging them first tells you how much floor is genuinely left. That number determines the rug size, the storage that fits, and whether extras like a futon are realistic at all.",
    },
  ],
  Body,
};

export default post;
