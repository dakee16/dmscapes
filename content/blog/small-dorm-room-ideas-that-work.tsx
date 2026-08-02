import type { BlogPost } from "./types";
import {
  Lead,
  H2,
  H3,
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
        The moves that actually make a small dorm work are the same few every
        time: go vertical so the floor opens up, treat the space under the bed
        as a second room, keep most of the floor visible, and choose furniture
        that folds, rolls, or does two jobs. The catch is that the right move
        depends on the room’s shape. A trick that rescues a square room can
        wreck a long corridor room, which is why the fix has to start with your
        actual layout, not a generic list.
      </Lead>

      <H2>Start with the shape, not the stuff</H2>
      <P>
        Small dorm rooms fail in different ways. A square room runs out of wall.
        A long, narrow corridor room runs out of walkable floor. An L-shaped or
        slant-ceilinged room has a corner you can’t use for anything tall. Before
        you buy a single organizer, decide which room you have, because the plan
        follows from that.
      </P>
      <Ul>
        <Li>
          <strong>Square and tight:</strong> the problem is wall space. Go up and
          use the vertical.
        </Li>
        <Li>
          <strong>Corridor, long and thin:</strong> the problem is the walkway.
          Keep the center clear and push everything to the ends and walls.
        </Li>
        <Li>
          <strong>L-shaped or slanted:</strong> the problem is one dead corner.
          Put the bed or low storage there and save full-height walls for
          shelves.
        </Li>
      </Ul>

      <H2>Go vertical, because the floor is finite</H2>
      <P>
        Every small-room win starts by moving storage off the floor and onto the
        walls and air.
      </P>
      <Ul>
        <Li>
          Loft or raise the bed. Lofting is the single biggest gain in a small
          room, turning the space under the bed into a desk nook, a dresser bay,
          or a wall of storage.
        </Li>
        <Li>
          Buy tall and narrow, not short and wide. A slim shelf that reaches for
          the ceiling stores more per square foot of floor than a low unit.
        </Li>
        <Li>
          Use the backs of doors and the closet interior. Over-the-door
          organizers, a tension rod, and hooks add storage that costs zero floor.
        </Li>
        <Li>
          Take the walls seriously. Command shelves, a pegboard, and a hanging
          organizer put daily things at eye level instead of in a pile.
        </Li>
      </Ul>

      <H2>The under-bed is a second room</H2>
      <P>
        Once the bed is raised, the space beneath it is the most valuable real
        estate you own. The only number you need is the clearance from the floor
        to the bottom of the frame, which decides what fits.
      </P>
      <Ol>
        <Li>
          Measure the under-bed clearance at every height the frame allows. Six
          inches means low bins, fifteen inches means rolling drawers, and a full
          loft means a whole zone. See{" "}
          <TextLink href="/blog/how-to-measure-your-dorm-room">
            how to measure your dorm room
          </TextLink>{" "}
          for the rest of the numbers.
        </Li>
        <Li>
          Match the container to the clearance. Rolling drawers for clothes, flat
          bins for out-of-season gear, and a slim hamper that tucks in on wheels.
        </Li>
        <Li>
          Keep it accessible. Anything you reach for weekly goes on wheels so it
          rolls out instead of forcing you onto the floor.
        </Li>
      </Ol>

      <H2>Keep the floor doing one job</H2>
      <P>
        A room reads as bigger when you can see the floor. Aim to leave most of
        it visible and let one rug do the work of zoning.
      </P>
      <Ul>
        <Li>
          One rug defines the space. It separates the sleep zone from the
          study-and-hang zone without a single wall.
        </Li>
        <Li>
          Resist filling corners with furniture. An empty corner is breathing
          room, not wasted space.
        </Li>
        <Li>
          Choose a rug that fits the open floor, not the whole room. In a
          furnished room a 5-by-7 usually looks larger than an 8-by-10 that
          vanishes under the bed and desk.
        </Li>
      </Ul>

      <H2>Furniture that earns its footprint</H2>
      <P>
        In a small room, every piece should fold, roll, or do two jobs.
      </P>
      <Ul>
        <Li>A storage ottoman: seating, a footrest, and a bin in one shape.</Li>
        <Li>A rolling drawer cart that lives under the desk and comes out when needed.</Li>
        <Li>A folding chair or desk chair that tucks flat against the wall.</Li>
        <Li>A bedside shelf or clip-on caddy instead of a nightstand that eats floor.</Li>
      </Ul>

      <H2>Make it feel bigger than it is</H2>
      <Ul>
        <Li>
          Hang a mirror across from the window. It doubles the daylight and the
          apparent depth of the room.
        </Li>
        <Li>
          Light the walls, not just the ceiling. Two warm lamps at different
          heights make a small room feel layered instead of boxed in.
        </Li>
        <Li>
          Keep sightlines low and clear. Nothing tall in front of the window,
          nothing blocking the line from the door across the room.
        </Li>
      </Ul>

      <H2>The awkward rooms, specifically</H2>
      <H3>The corridor room</H3>
      <P>
        Long and narrow is the hardest shape because the walkway is the whole
        room. Push both beds and all storage flat to the long walls, keep the
        center aisle clear end to end, and use the far wall by the window as the
        one zone that isn’t traffic. Never float furniture into the middle.
      </P>
      <H3>The tight double</H3>
      <P>
        When two people share a square, symmetry keeps the peace and the space.
        Bunk or loft both beds to reclaim half the floor, mirror each side so the
        room reads balanced, and let a shared rug mark the neutral middle.
      </P>
      <H3>The slanted ceiling</H3>
      <P>
        Put the bed or a low dresser under the slope where you can’t stand
        anyway, and reserve the full-height wall for anything you need to reach
        standing up.
      </P>

      <Callout label="Why room-specific planning wins">
        <p>
          A generic small-room list can’t tell you whether the loft clears your
          window or the rug fits your walkway. Dormscape can, because it plans
          against your real room’s dimensions and shape. You arrange the actual
          furniture on your actual floor plan and catch the piece that doesn’t
          fit on screen, not on move-in day.
        </p>
        <p>
          Check whether your school is on{" "}
          <TextLink href="/colleges">our list of colleges</TextLink>, then{" "}
          <TextLink href="/plan">plan your exact room</TextLink> and try the loft
          layout before you commit to it.
        </p>
      </Callout>

      <EndCTA>See the space-saving layout in your real room before you buy.</EndCTA>
    </>
  );
}

const post: BlogPost = {
  slug: "small-dorm-room-ideas-that-work",
  title: "Small dorm room ideas that actually work",
  metaTitle: "Small Dorm Room Ideas That Actually Work",
  description:
    "Space-maximizing ideas for small and awkward dorm rooms: go vertical, use the under-bed, zone with a rug, and layouts for corridor rooms and tight doubles.",
  excerpt:
    "Real space-saving moves for small and awkward rooms, from lofting the bed to zoning with a rug, plus specific fixes for corridor rooms and tight doubles.",
  date: "2026-07-20",
  updated: "2026-07-27",
  readingTimeMin: 7,
  faqTopic: "Small and awkward rooms",
  faqs: [
    {
      q: "How do you make a small dorm room feel bigger?",
      a: "Loft the bed to free the floor, keep most of the floor visible, use one rug to zone the space, hang a mirror across from the window to bounce light, and choose tall, narrow storage over wide, low pieces. Clear sightlines from the door make the biggest visual difference.",
    },
    {
      q: "What is the best layout for a long, narrow dorm room?",
      a: "Push both beds and all storage flat against the long walls and keep the center aisle clear from end to end. Use the far wall by the window as the only non-traffic zone, and never float furniture into the middle of a corridor room.",
    },
    {
      q: "How should two people share a small dorm room?",
      a: "Bunk or loft both beds to reclaim floor space, mirror each side so the room reads balanced, and use a shared rug to mark the neutral middle. Symmetry keeps a tight double feeling fair and open.",
    },
    {
      q: "What is the biggest space-saver in a small dorm?",
      a: "Lofting or raising the bed. It converts the space under the bed into a desk nook, a dresser bay, or a full wall of storage, which is the largest single gain available in a small room.",
    },
  ],
  Body,
};

export default post;
