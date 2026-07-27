import type { BlogPost } from "./types";
import {
  Lead,
  H2,
  P,
  Ul,
  Ol,
  Li,
  Callout,
  EndCTA,
  TextLink,
} from "@/components/blog/Prose";

function Body() {
  return (
    <>
      <Lead>
        Before you buy anything for a dorm, get six numbers: the room’s length
        and width, the usable length of each wall, the ceiling height, the
        under-bed clearance, the window size, and the door width. The trap is
        that a furnished dorm gives you far less open floor than the footprint
        suggests, so measure the space that’s actually left after the bed, desk,
        and dresser are in it. That one habit is what separates a rug that lies
        flat from the one you’re rolling back up on move-in day.
      </Lead>

      <H2>Why measuring first actually matters</H2>
      <P>
        Returns during move-in week are miserable. The stores nearest campus are
        picked clean, your car is full, and you have a two-hour window before
        your parents drive home. A rug that’s four inches too wide, a storage
        cart that blocks the closet, a shelf that won’t clear the loft: each one
        becomes a problem you solve standing in a hallway, not a problem you
        avoid in July.
      </P>
      <P>
        Almost every dorm comes furnished, and most of that furniture is heavy,
        bolted, or shared. You are decorating around a fixed bed, desk, and
        dresser, not an empty box. The number that matters is not the room size
        printed in the housing brochure. It’s the open floor and wall space left
        once the built-ins are where they’re going to stay.
      </P>

      <H2>What you need</H2>
      <Ul>
        <Li>
          A 25-foot tape measure. Dorm rooms are small, but a 12-foot tape runs
          out exactly when you need the diagonal.
        </Li>
        <Li>Your phone, for photos of every wall and a place to jot numbers.</Li>
        <Li>
          Painter’s tape. Mark a rug or a rug-sized rectangle on the floor and
          you’ll see the fit before you spend a cent.
        </Li>
        <Li>Graph paper or a notes app to sketch the room roughly to scale.</Li>
        <Li>
          A second person. One holds the tape, one reads it, and the numbers
          stop being guesses.
        </Li>
      </Ul>
      <P>
        A laser measure is nice and fast, but it is not necessary. A tape and
        ten minutes get you everything below.
      </P>

      <H2>The measurements that matter</H2>
      <Ol>
        <Li>
          <strong>Room length and width.</strong> Measure the floor wall to
          wall, then note any alcove, radiator nook, or angled corner
          separately. The rectangle you can actually use is usually smaller than
          the full outline.
        </Li>
        <Li>
          <strong>Each usable wall.</strong> Measure the clear run of every wall
          after the fixed furniture. This is where a desk hutch, a bookshelf, or
          a mini fridge has to fit, and wall space runs out faster than floor
          space.
        </Li>
        <Li>
          <strong>Ceiling height.</strong> You need this before you loft a bed
          or buy tall storage. Standard is around eight feet, but older halls
          run lower and a few have angled ceilings that kill the top shelf.
        </Li>
        <Li>
          <strong>Under-bed clearance.</strong> Measure from the floor to the
          bottom of the bed frame at each height the frame allows. This single
          number decides whether you buy 6-inch bins, tall rolling drawers, or a
          full set of stackable crates.
        </Li>
        <Li>
          <strong>Window size and sill height.</strong> Width and height for
          curtains, and the height off the floor for command hooks, a fan, or a
          window AC unit if your hall allows one.
        </Li>
        <Li>
          <strong>Door width and swing.</strong> Measure the doorway opening,
          then check which way the door swings and how far it travels. A dresser
          that fits the room does you no good if it won’t clear the door.
        </Li>
        <Li>
          <strong>Closet width, depth, and rod height.</strong> Depth decides
          whether standard hangers fit facing forward or have to turn sideways,
          and rod height tells you how much hanging length you get for an
          over-the-door or hanging organizer.
        </Li>
        <Li>
          <strong>Existing furniture footprints.</strong> The bed, desk, and
          dresser you can’t move. Their length and width are what you subtract
          from the room to find the floor you’re decorating.
        </Li>
      </Ol>

      <H2>The mistakes that cost you a return trip</H2>
      <Ul>
        <Li>
          Measuring the room instead of the open floor. The footprint looks
          roomy until the furniture is in it.
        </Li>
        <Li>
          Forgetting vertical space. Half of a small room’s storage lives under
          a lofted bed and above the closet, and both need real numbers.
        </Li>
        <Li>
          Buying a rug to the full room dimension. Once the bed and desk sit on
          the floor, a 5-by-7 usually reads better than an 8-by-10 that
          disappears under everything.
        </Li>
        <Li>
          Ignoring the door swing and the radiator. Both eat a corner you were
          counting on.
        </Li>
        <Li>
          Trusting a brochure photo instead of a number. Wide-angle lenses make
          every dorm look twice its size.
        </Li>
        <Li>
          Leaving it all until move-in day, when nothing is returnable and every
          store is empty.
        </Li>
      </Ul>

      <H2>Can’t get into the room yet?</H2>
      <P>
        Most incoming students never stand in the room before the day they move
        in, which is exactly when measuring is hardest. You have two ways
        around that. Your housing portal often posts floor plans with
        dimensions, and housing staff will usually answer a direct email about a
        specific hall.
      </P>
      <P>
        The faster route, for schools we’ve already covered, is to skip the tape
        measure entirely. Dormscape starts from your actual room using
        dimensions pulled from official university housing data, so you can lay
        out furniture and build a shopping list that fits before you own a
        single box. Check whether your school is on{" "}
        <TextLink href="/colleges">the list of colleges</TextLink>, from{" "}
        <TextLink href="/colleges/ut-austin">UT Austin</TextLink> to{" "}
        <TextLink href="/colleges/nyu">NYU</TextLink>, then{" "}
        <TextLink href="/plan">plan your room</TextLink> around real numbers.
      </P>

      <Callout label="Dormscape shortcut">
        <p>
          If your school is in our database, the six measurements above are
          already done for your room type. You pick the building, we show the
          dimensions, and you go straight to the layout. If it isn’t,{" "}
          <TextLink href="/add-school">add your school</TextLink> and we’ll get
          measuring.
        </p>
      </Callout>

      <EndCTA>Your room has a real size. Plan around it, not around a guess.</EndCTA>
    </>
  );
}

const post: BlogPost = {
  slug: "how-to-measure-your-dorm-room",
  title: "How to measure your dorm room before you move in",
  metaTitle: "How to Measure Your Dorm Room (Before You Buy Anything)",
  description:
    "A practical guide to measuring a dorm room: the six numbers that matter, the tools you need, and the mistakes that cost you a return trip on move-in day.",
  excerpt:
    "The six numbers to get before you buy anything, the tools you actually need, and the measuring mistakes that end in a return trip during move-in week.",
  date: "2026-07-27",
  updated: "2026-07-27",
  readingTimeMin: 7,
  faqTopic: "Measuring your room",
  faqs: [
    {
      q: "What should I measure in a dorm room first?",
      a: "Start with the open floor left after the built-in furniture, then the usable length of each wall, the ceiling height, the under-bed clearance, the window size, and the door width. The open floor and under-bed clearance drive the most buying decisions, from rug size to storage bins.",
    },
    {
      q: "What size rug fits a standard dorm room?",
      a: "For most furnished singles and doubles, a 5-by-7 rug fits the open floor better than a larger size, because the bed, desk, and dresser cover a big share of the room. Measure the clear floor and tape out the rectangle before buying.",
    },
    {
      q: "Can I measure my dorm before move-in day?",
      a: "Often yes. Many housing portals publish floor plans with dimensions, and housing staff will usually confirm a specific hall by email. For supported schools, Dormscape already has official room dimensions, so you can plan without measuring at all.",
    },
    {
      q: "Do I need a laser measure for a dorm room?",
      a: "No. A 25-foot tape measure and a few minutes cover everything. A laser tool is faster but not worth buying just for one small room.",
    },
  ],
  Body,
};

export default post;
