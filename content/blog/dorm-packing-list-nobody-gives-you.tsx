import type { BlogPost } from "./types";
import {
  Lead,
  H2,
  P,
  Ul,
  Li,
  Callout,
  EndCTA,
  TextLink,
} from "@/components/blog/Prose";
import { SCHOOLS } from "@/lib/schools";
import { dormSizeStats } from "@/lib/dorm-sizes";
import { fitRoom, furnitureSqFt, ft } from "@/lib/room-preview";

// Room numbers from the published sizes (lib/dorm-sizes), so the list is
// sized for the room students actually get and never drifts from the data.
const SIZES = dormSizeStats(SCHOOLS);
const [SINGLE, DOUBLE] = SIZES.byType;
const DOUBLE_FIT = fitRoom({
  type: "double",
  label: "Double",
  occupants: 2,
  length_ft: DOUBLE.lengthFt,
  width_ft: DOUBLE.widthFt,
  sqft: null,
  bed_size: "twin_xl",
  closet: null,
})!;
const DOUBLE_SQFT = Math.round(DOUBLE_FIT.lengthFt * DOUBLE_FIT.widthFt);
const OPEN_FLOOR = DOUBLE_SQFT - furnitureSqFt(DOUBLE_FIT);
const DOUBLE_DIMS = `${ft(DOUBLE_FIT.lengthFt)} × ${ft(DOUBLE_FIT.widthFt)}\u00a0ft`;
const TWIN_XL = Math.round(SIZES.twinXlShare * 100);

function Body() {
  return (
    <>
      <Lead>
        The generic packing list covers bedding, towels, and a shower caddy, and
        then abandons you. The things freshmen actually forget are the small,
        boring ones: command strips in every size, a UL-listed surge protector,
        a mattress topper because the dorm mattress is a vinyl slab, a sick-week
        kit for the October cold that always comes, and a drying rack because
        the dryer will shrink your clothes. Below is the dorm packing list,
        organized by the situation you’ll be in when you realize you needed it.
      </Lead>

      <H2>Pack for the room you’re actually getting</H2>
      <P>
        {`Every item below has to fit somewhere. The typical double that colleges publish is ${DOUBLE_DIMS}, about ${DOUBLE_SQFT} square feet. Once two beds, desks and dressers are in, roughly ${OPEN_FLOOR} square feet of open floor is left to share, about ${Math.round(OPEN_FLOOR / 2)} each. A typical single is about ${Math.round(SINGLE.median)} square feet.`}
      </P>
      <Ul>
        <Li>
          Look your room up before you shop. If your school is on{" "}
          <TextLink href="/colleges">our list of colleges</TextLink>, your hall’s
          published dimensions are already there; if not, here’s the{" "}
          <TextLink href="/dorm-room-size">average dorm room size</TextLink> for
          singles, doubles and triples.
        </Li>
        <Li>
          Think flat and stackable. Floor runs out first, so under-bed bins, a
          door hanger and wall hooks beat anything with legs.
        </Li>
        <Li>
          Split the big items with your roommate before anyone buys: one mini
          fridge, one rug, one microwave if your hall allows it. A{" "}
          <TextLink href="/blog/shared-dorm-shopping-list">
            shared dorm shopping list
          </TextLink>{" "}
          stops the two-fridge problem.
        </Li>
      </Ul>

      <H2>The first three hours: move-in day</H2>
      <P>
        Move-in is a traffic jam of families, dollies, and one elevator. Pack a
        small box that rides with you, not buried in the car.
      </P>
      <Ul>
        <Li>
          A basic tool kit: a mini screwdriver set, scissors, and a handful of
          zip ties. Something always needs tightening or opening in the first
          hour.
        </Li>
        <Li>
          A box cutter and a roll of painter’s tape. Everything you own is in
          cardboard, and painter’s tape labels doors and marks a rug outline
          without pulling paint.
        </Li>
        <Li>
          Cleaning wipes and a roll of paper towels. The room was “cleaned” by
          someone in a hurry. Wipe the desk, the sill, and the closet shelf
          before your clothes touch them.
        </Li>
        <Li>
          A doorstop. Propping the door with a shoe for four hours gets old, and
          it’s the fastest way to meet the hall.
        </Li>
      </Ul>

      <H2>The unglamorous hardware</H2>
      <P>
        This is the category no one photographs and everyone needs. It’s also
        where dorm rules bite, so read your housing guide before you buy.
      </P>
      <Ul>
        <Li>
          Command strips and hooks in three sizes, plus the picture-hanging
          variety. Nails and thumbtacks cost you the damage deposit; adhesive
          hooks give it back.
        </Li>
        <Li>
          A UL-listed surge protector, not a cheap power strip. Many halls
          specifically ban basic strips and daisy-chaining, and the wall outlet
          is always on the wrong side of the room.
        </Li>
        <Li>
          One long extension cord and a small outlet extender with USB ports.
          Two outlets do not serve a laptop, a phone, a lamp, a fan, and a mini
          fridge.
        </Li>
        <Li>
          A step stool. Lofted beds and top closet shelves are designed for
          people who own one. Foldable ones tuck behind the door.
        </Li>
        <Li>
          Batteries and a phone battery bank. Smoke-detector chirps and dead
          phones both happen at the worst time.
        </Li>
      </Ul>

      <H2>Sleep, because the mattress is a crime</H2>
      <P>
        Dorm mattresses are thin, plastic-wrapped, and have hosted a decade of
        strangers. Fixing your sleep is the highest-return money you’ll spend.
      </P>
      <Ul>
        <Li>
          A mattress topper, two to three inches. This is the upgrade people
          rave about in October and wish they’d bought in August.
        </Li>
        <Li>
          A zippered mattress protector. It seals off the vinyl and whatever
          lived there before you.
        </Li>
        <Li>
          {`Twin XL sheets, not twin. ${TWIN_XL}% of the dorm rooms colleges publish come with extra-long Twin XL beds, and regular twin sheets pop off the corners all night.`}
        </Li>
        <Li>
          An eye mask and earplugs, or a small white-noise fan. Your roommate’s
          alarm and schedule will not match yours.
        </Li>
      </Ul>

      <H2>The bathroom-down-the-hall kit</H2>
      <P>
        Even in a suite, you’re sharing. Plan for a walk to the shower and back.
      </P>
      <Ul>
        <Li>
          Shower shoes. Non-negotiable in a communal bathroom, and cheap enough
          to replace each semester.
        </Li>
        <Li>
          A shower caddy that drains, in mesh or with holes. A solid plastic one
          grows a science project by week three.
        </Li>
        <Li>
          A robe and a second, quick-dry towel. The walk back is public, and one
          towel is never dry when you need it.
        </Li>
        <Li>
          A toothbrush cover and a small lockable pouch for anything you’d
          rather not leave on a shared shelf.
        </Li>
      </Ul>

      <H2>Laundry reality</H2>
      <Ul>
        <Li>
          A collapsible drying rack. Communal dryers run hot and shrink
          everything you care about. Air-dry the good stuff.
        </Li>
        <Li>
          Two mesh laundry bags so you can sort lights and darks on the walk
          down, plus a delicates bag that saves your socks.
        </Li>
        <Li>
          A stain pen and a bottle of detergent pods. The pen buys you a day
          before a stain sets.
        </Li>
        <Li>
          Quarters or the campus laundry app set up in advance, because the
          first laundry day is always the day you’re out of clean clothes.
        </Li>
      </Ul>

      <H2>The sick-week kit</H2>
      <P>
        A dorm is a petri dish and the health center keeps banker’s hours. You
        will get the campus cold. Assemble this in August and forget about it
        until you need it at 2 a.m.
      </P>
      <Ul>
        <Li>A thermometer, ibuprofen, and cough drops.</Li>
        <Li>
          Electrolyte packets and a few cans of soup you can heat in a microwave.
        </Li>
        <Li>
          A small first-aid kit: bandages, antiseptic, and any prescription you
          take, in a labeled pouch.
        </Li>
        <Li>Tissues and hand sanitizer that actually live on your desk.</Li>
      </Ul>

      <H2>A kitchen without a kitchen</H2>
      <Ul>
        <Li>
          One mug, one bowl, one fork, one spoon, and a small knife. You do not
          need a 12-piece set. You need to not eat cereal out of the box.
        </Li>
        <Li>
          A water filter pitcher and a reusable bottle. Campus tap water is a
          gamble worth hedging.
        </Li>
        <Li>
          A few food storage containers and a bottle brush with dish soap. Dining
          hall leftovers are free dinner if you can carry them.
        </Li>
        <Li>A real trash can with a stash of bags. No one hands you one.</Li>
      </Ul>

      <Callout label="Before you add to cart">
        <p>
          Half of this only fits if the room does. A drying rack, a step stool,
          and a filter pitcher all need floor and shelf space you may not have.
          Measure before you buy, or let us measure for you. Start with{" "}
          <TextLink href="/blog/how-to-measure-your-dorm-room">
            how to measure your dorm room
          </TextLink>
          , then <TextLink href="/plan">plan the layout</TextLink> so the list
          matches the space.
        </p>
      </Callout>

      <H2>The stuff you’ll want in week two</H2>
      <P>
        None of this is urgent on day one, and all of it improves the room once
        you’ve lived in it for a week.
      </P>
      <Ul>
        <Li>
          A 5 × 7 rug and a rug pad. The floor is hard and cold, a 5 × 7 fits
          the open floor of most furnished singles and doubles better than a
          bigger size, and a pad keeps it from sliding.
        </Li>
        <Li>
          A clip-on or floor lamp with warm bulbs. Overhead fluorescents are an
          interrogation, not a mood.
        </Li>
        <Li>Blackout curtains, if roommates keep opposite hours.</Li>
        <Li>
          A lint roller, a small sewing kit, and safety pins. The unphotogenic
          heroes of every dorm.
        </Li>
      </Ul>

      <P>
        For what the whole setup costs across budget, mid, and premium tiers,
        read{" "}
        <TextLink href="/blog/how-much-does-a-dorm-room-cost">
          how much it actually costs to set up a dorm room in 2026
        </TextLink>
        . And if your school is on{" "}
        <TextLink href="/colleges">our list of colleges</TextLink>, the layout
        step turns this list into a plan that fits your exact room.
      </P>

      <EndCTA>
        Turn the checklist into a room that actually fits it.
      </EndCTA>
    </>
  );
}

const post: BlogPost = {
  slug: "dorm-packing-list-nobody-gives-you",
  title: "The dorm packing list nobody gives you",
  metaTitle: "Dorm Packing List: What Freshmen Actually Forget",
  description: `A dorm packing list for what freshmen actually forget, from surge protectors and mattress toppers to a sick-week kit, sized for a ${DOUBLE_SQFT} sq ft room.`,
  excerpt:
    "Beyond bedding and towels. The small, boring, easily-forgotten items that actually make a dorm livable, organized by the moment you’ll wish you had them.",
  date: "2026-07-24",
  updated: "2026-10-14",
  readingTimeMin: 9,
  faqTopic: "Packing",
  faqs: [
    {
      q: "How much space will I have in a dorm room?",
      a: `Less than you think. The typical double is ${DOUBLE_DIMS}, about ${DOUBLE_SQFT} square feet, and once two beds, desks and dressers are in, about ${OPEN_FLOOR} square feet of open floor is left, roughly ${Math.round(OPEN_FLOOR / 2)} each. A typical single is about ${Math.round(SINGLE.median)} square feet. Pack for that, not for your bedroom at home.`,
    },
    {
      q: "What do freshmen forget to pack for a dorm most often?",
      a: "The most commonly forgotten items are a UL-listed surge protector, a mattress topper, a mattress protector, command strips, a drying rack, a step stool for lofted beds, and a small sick-week kit with a thermometer and pain reliever. None are exciting, and all get used within the first month.",
    },
    {
      q: "What should not go on a dorm packing list?",
      a: "Skip candles, halogen lamps, and most hot plates and toasters, which are banned in many halls for fire safety. Basic power strips without surge protection are often prohibited too. Check your housing guide before buying anything with a heating element or an open flame.",
    },
    {
      q: "Do I need twin or twin XL sheets for a dorm?",
      a: "Almost always twin XL. Most dorm beds are extra long, so standard twin sheets are five inches too short and slip off the corners. Confirm with your housing office, but buy twin XL unless told otherwise.",
    },
    {
      q: "Is a mattress topper worth it for a dorm?",
      a: "Yes. Dorm mattresses are thin and vinyl-wrapped, and a two to three inch topper is the single most noticeable comfort upgrade for the money. Pair it with a zippered mattress protector.",
    },
  ],
  Body,
};

export default post;
