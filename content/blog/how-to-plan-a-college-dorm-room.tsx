import type { BlogPost } from "./types";
import { Lead, H2, P, Ul, Li, Callout, EndCTA, TextLink } from "@/components/blog/Prose";

function Body() {
  return (
    <>
      <Lead>
        Most dorm shopping goes wrong in the same order every year: you buy the
        aesthetic first, then discover the rug is a foot too wide, the storage
        cart has nowhere to stand, and your roommate bought the same lamp.
        Planning a dorm room properly is four decisions in a specific order, and
        the order is what saves you money. Here it is.
      </Lead>

      <H2>Step 1: get the actual room, not a guess</H2>
      <P>
        Everything downstream depends on one number pair: how long and how wide
        the room is. Do not start from a Pinterest board or a packing list. Start
        from your building.
      </P>
      <Ul>
        <Li>
          Check your housing portal and your school&rsquo;s residence-life pages.
          Many universities publish per-room-type dimensions, and some publish
          floor plans.
        </Li>
        <Li>
          If your school publishes nothing, measure after move-in or ask your RA.
          Our{" "}
          <TextLink href="/blog/how-to-measure-your-dorm-room">
            dorm measuring guide
          </TextLink>{" "}
          covers what to record and what people usually forget (door swing,
          radiator, window wall).
        </Li>
        <Li>
          Note the bed size. Twin XL is the common default, but plenty of halls
          use standard twin, full, or full XL, and bedding is the easiest thing
          to buy wrong.
        </Li>
      </Ul>
      <P>
        Dormscape keeps this data for{" "}
        <TextLink href="/colleges">hundreds of residence halls</TextLink>, so for
        many schools you can skip straight to a room that already has the right
        footprint.
      </P>

      <H2>Step 2: lay out the furniture before you buy anything</H2>
      <P>
        Your room already has a bed, a desk, a chair, a dresser, and usually a
        closet. Those are fixed costs in space. Arrange them first, because they
        decide how much floor is actually left. A 12 x 16 double sounds roomy
        until two beds, two desks, and two dressers are in it.
      </P>
      <P>
        Three arrangement patterns cover most rooms: beds on opposite walls
        (most privacy), beds parallel along one wall (most open floor), or lofted
        beds with desks underneath (most storage). Try them against your real
        dimensions rather than in your head, and check the walkway between
        pieces. Under about two and a half feet, a gap stops being a walkway.
      </P>

      <H2>Step 3: pick a style and a budget, in that order</H2>
      <P>
        Now the fun part, and now it is safe. With the layout settled you know
        which pieces you actually need and roughly what size each one can be, so
        style becomes a color and texture decision instead of a gamble. Set a
        real number before you shop. Somewhere between $200 and $600 covers most
        first-year rooms if you are not replacing furniture.
      </P>
      <P>
        Coordinate with your roommate at this step, not earlier and not later.
        Split the shared items (rug, fridge, mirror, storage) and keep bedding and
        decor personal. Two people independently buying a rug is the single most
        common duplicate.
      </P>

      <H2>Step 4: turn the plan into one shopping list</H2>
      <P>
        The output of planning should be a list with sizes attached, not a mood
        board. For every item write down the dimension that matters: rug width,
        shelf height, whether the fridge fits under the desk. Then buy against
        the list. If something is out of stock, you know exactly what size the
        substitute has to be.
      </P>
      <Ul>
        <Li>Bedding sized to your actual mattress, not the default twin.</Li>
        <Li>A rug that fits the open floor, measured, not eyeballed.</Li>
        <Li>Storage that fits under the bed at its real clearance height.</Li>
        <Li>Lighting, since most dorm overheads are unkind.</Li>
        <Li>A power strip, because outlets are always in the wrong place.</Li>
      </Ul>

      <H2>The short version</H2>
      <P>
        Room first, layout second, style and budget third, list last. Do it in
        that order and almost nothing has to go back. Do it in the other order and
        you will pay return shipping to learn your room&rsquo;s dimensions.
      </P>

      <Callout label="Skip the graph paper">
        <p>
          Dormscape does these four steps in about a minute:{" "}
          <TextLink href="/plan">pick your building</TextLink> to load its real
          dimensions, get a layout that fits, set your style and budget, and leave
          with a shoppable list. Free, and no account needed to try it.
        </p>
      </Callout>

      <EndCTA>Plan the room before you shop for it.</EndCTA>
    </>
  );
}

const post: BlogPost = {
  slug: "how-to-plan-a-college-dorm-room",
  title: "How to plan a college dorm room",
  metaTitle: "How to Plan a College Dorm Room (Step by Step)",
  description:
    "A four-step order for planning a dorm room: get the real dimensions, lay out the fixed furniture, set style and budget, then build one shopping list with sizes.",
  excerpt:
    "Dorm shopping goes wrong in the same order every year. Here is the order that works: room, layout, style and budget, then the list.",
  date: "2026-08-31",
  readingTimeMin: 6,
  faqTopic: "Planning a dorm room",
  faqs: [
    {
      q: "How do I plan a college dorm room?",
      a: "Work in four steps and keep them in order. First get your room's real dimensions from your housing portal or by measuring. Second, arrange the fixed furniture (bed, desk, chair, dresser) to see how much floor is actually left. Third, pick a style and set a budget. Fourth, turn the plan into one shopping list with a size written next to every item.",
    },
    {
      q: "What should I do first when planning a dorm room?",
      a: "Get the room's length and width before anything else. Every other decision, especially rug size, storage, and whether a futon fits, depends on those two numbers. Starting from a mood board instead is what causes returns.",
    },
    {
      q: "How much space do I need between dorm furniture?",
      a: "Keep at least about two and a half feet for any path you walk through daily. Below that a gap stops functioning as a walkway, which is why a rug or storage cart that technically fits can still make a room unusable.",
    },
    {
      q: "What should roommates split when planning a dorm room?",
      a: "Split the shared, one-per-room items: rug, mini fridge, microwave, full-length mirror, and any shared storage. Keep bedding, desk lamps, and decor personal. Coordinate after you have a layout, so you know what sizes the shared items need to be.",
    },
  ],
  Body,
};

export default post;
