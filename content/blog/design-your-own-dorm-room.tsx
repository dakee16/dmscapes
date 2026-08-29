import type { BlogPost } from "./types";
import { Lead, H2, P, Ul, Li, Callout, EndCTA, TextLink } from "@/components/blog/Prose";

function Body() {
  return (
    <>
      <Lead>
        Most dorm rooms are already in Dormscape&rsquo;s data: pick your school and
        building and the exact dimensions, bed size, and window are filled in for
        you. But not every room is on the list, and not every room is a tidy
        rectangle. If your school isn&rsquo;t covered yet, or your room has an
        alcove, an angled wall, or an L-shape, you can draw it yourself in about a
        minute and get the same layout and shopping list back.
      </Lead>

      <H2>When to draw your own room</H2>
      <P>
        Reach for the drawing tool in two situations. The first is coverage: we add
        schools constantly, but if yours isn&rsquo;t mapped yet, drawing your room
        is faster than waiting. The second is shape. Plenty of real dorms aren&rsquo;t
        plain boxes, they have a closet nook that eats a corner, a bumped-out
        window bay, or a genuine L when two rooms share a wall. A rectangle
        estimate gets those wrong. Your own outline gets them exact.
      </P>

      <H2>How the drawing tool works</H2>
      <P>
        You trace the room wall by wall. Tap to drop a corner, then tap around the
        perimeter; walls snap square and to a six-inch grid, so the shape stays
        clean without fiddling, and a live dimension label rides every wall in feet
        and inches as you go. Tap your first corner again to close the loop. From
        there you drop in the fixtures:
      </P>
      <Ul>
        <Li>
          <span className="font-semibold text-ink">Doors and windows</span> snap onto
          a wall at a standard size. Slide them along the wall to match where yours
          actually sit.
        </Li>
        <Li>
          <span className="font-semibold text-ink">Closets</span> drop in as a block
          you can move and resize, since closet footprints vary more than a door
          does.
        </Li>
        <Li>
          <span className="font-semibold text-ink">Undo and clear</span> are one tap
          away, so an experiment never costs you the whole drawing.
        </Li>
      </Ul>

      <H2>What happens after you draw it</H2>
      <P>
        Once you hit <span className="font-semibold text-ink">Plan this room</span>,
        the flow is exactly the same as a listed room: pick a vibe, set a budget,
        and get a result. The difference is the layout. Instead of dropping a
        rectangular template into your space, Dormscape reads your actual walls and
        places furniture against them: the bed on the longest wall, the desk under a
        window if you drew one, storage along a secondary wall, and the rug centered
        in the open floor. Then every piece is yours to drag, rotate, hide, or swap,
        the full editor you get on any room. If a room is a plain rectangle, drawing
        it just uses our polished templates; the shape-aware placement kicks in for
        the irregular ones that need it.
      </P>

      <H2>Draw it once, reuse it</H2>
      <P>
        A room you draw saves to your account like any design, walls, doors,
        windows, and closets included. Want to see the same room in a different vibe
        or at a different budget? Start a new plan and pick it from{" "}
        <span className="font-semibold text-ink">Reuse a room you drew</span>, no
        redrawing. It&rsquo;s the honest version of &ldquo;measure once&rdquo;: the
        geometry is fixed, the styling is free to change. If you&rsquo;d rather start
        from real published dimensions, see{" "}
        <TextLink href="/blog/how-to-measure-your-dorm-room">
          how to measure your dorm room
        </TextLink>
        .
      </P>

      <Callout label="Draw it, then plan it">
        <p>
          Drawing your own room is a <TextLink href="/pricing">Plus</TextLink>{" "}
          feature (Plus and Pro both include it). Open the planner, choose{" "}
          <TextLink href="/plan/draw">Draw your own room</TextLink>, trace your walls, and
          plan the room around the shape you actually live in.
        </p>
      </Callout>

      <EndCTA>Your room, your shape. Draw it and plan it.</EndCTA>
    </>
  );
}

const post: BlogPost = {
  slug: "design-your-own-dorm-room",
  title: "How to draw your own dorm room",
  metaTitle: "Draw Your Own Dorm Room Floor Plan",
  description:
    "School not listed, or an odd-shaped room? Draw your exact floor plan, walls, doors, windows, and closets, and get a layout built to fit it.",
  excerpt:
    "Not every dorm is on the list, and not every room is a rectangle. Draw your exact floor plan, even an L-shape, and get a layout that fits it.",
  date: "2026-08-29",
  readingTimeMin: 5,
  faqTopic: "Draw your own room",
  faqs: [
    {
      q: "Can I plan a dorm room that isn't in Dormscape's database?",
      a: "Yes. If your school or room isn't listed yet, use Draw your own room to trace your exact floor plan wall by wall, add the door, windows, and closets, and then plan it with a vibe and budget just like a listed room. It's a Plus feature, included on both Plus and Pro.",
    },
    {
      q: "Does Dormscape support L-shaped or irregular dorm rooms?",
      a: "Yes. The drawing tool supports rectilinear outlines, so L-shapes, alcoves, notches, and other non-rectangular rooms are fine. When you draw an irregular room, Dormscape places furniture against your actual walls instead of dropping in a rectangular template, so the layout fits the real shape.",
    },
    {
      q: "How does drawing a room work?",
      a: "You tap to place corners and the walls snap square and to a six-inch grid, with a live feet-and-inches label on each wall. You drop fixed-size doors and windows onto the walls and slide them to position, add resizable closets, then tap Plan this room to continue into styling and budget.",
    },
    {
      q: "Can I reuse a room I drew for another design?",
      a: "Yes. A drawn room saves to your account with its full geometry. To plan it again with a different vibe or budget, start a new plan and pick it from Reuse a room you drew, no need to redraw it. Each plan counts toward your design limit the same as any other room.",
    },
    {
      q: "Do I need Plus to draw my own room?",
      a: "Yes. Drawing your own room is a Plus feature, and both Plus ($4.99 one time) and Pro ($14.99 one time) include it, along with all nine vibes, adding your own products, PDF and PNG export, and side-by-side comparison.",
    },
  ],
  Body,
};

export default post;
