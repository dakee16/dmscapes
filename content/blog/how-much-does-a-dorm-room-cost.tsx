import type { BlogPost } from "./types";
import {
  Lead,
  H2,
  H3,
  P,
  Ul,
  Li,
  Callout,
  EndCTA,
  TextLink,
} from "@/components/blog/Prose";

// One-off pricing table for this post. Kept local because no other post needs
// it; the styling mirrors the bordered cards used across the site.
function PriceRow({
  cat,
  budget,
  mid,
  premium,
}: {
  cat: string;
  budget: string;
  mid: string;
  premium: string;
}) {
  return (
    <tr className="border-t border-ink/8">
      <th
        scope="row"
        className="py-3 pr-4 text-left align-top text-sm font-semibold text-ink"
      >
        {cat}
      </th>
      <td className="py-3 pr-4 text-right align-top font-mono text-sm text-ink-soft">
        {budget}
      </td>
      <td className="py-3 pr-4 text-right align-top font-mono text-sm text-ink-soft">
        {mid}
      </td>
      <td className="py-3 text-right align-top font-mono text-sm text-ink-soft">
        {premium}
      </td>
    </tr>
  );
}

function Body() {
  return (
    <>
      <Lead>
        A realistic dorm setup in 2026 runs about $300 to $450 on a budget, $600
        to $1,000 for a comfortable mid-range, and $1,200 or more if you go
        premium, before big-ticket splits like a mini fridge. The two categories
        that move the total most are sleep and decor. Storage, lighting, and
        hardware stay cheap no matter how far you go. Here is the breakdown by
        category, with what’s worth spending on and what isn’t.
      </Lead>

      <H2>The quick math</H2>
      <P>
        Every number below is per student, in US dollars, for a standard
        furnished room where the bed, desk, and dresser are provided. Ranges
        reflect real product categories, the same kinds of items in the{" "}
        <TextLink href="/plan">Dormscape catalog</TextLink>: twin XL bedding,
        under-bed storage, clip and floor lamps, rugs and wall decor, bath
        basics, and the small hardware that makes a room work.
      </P>

      <div className="mt-6 overflow-x-auto rounded-xl border border-ink/10 bg-card">
        <table className="w-full min-w-[30rem] border-collapse text-left">
          <caption className="sr-only">
            Estimated dorm setup cost per student by category and tier, 2026.
          </caption>
          <thead>
            <tr>
              <th className="px-5 pt-4 pb-2 text-left font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                Category
              </th>
              <th className="px-0 pt-4 pb-2 pr-4 text-right font-mono text-[11px] uppercase tracking-wide text-cobalt">
                Budget
              </th>
              <th className="px-0 pt-4 pb-2 pr-4 text-right font-mono text-[11px] uppercase tracking-wide text-cobalt">
                Mid
              </th>
              <th className="px-0 pt-4 pb-2 pr-5 text-right font-mono text-[11px] uppercase tracking-wide text-cobalt">
                Premium
              </th>
            </tr>
          </thead>
          <tbody className="[&>tr>*:first-child]:pl-5 [&>tr>*:last-child]:pr-5">
            <PriceRow cat="Bedding and sleep" budget="$80-120" mid="$150-250" premium="$300-450" />
            <PriceRow cat="Storage" budget="$40-70" mid="$80-150" premium="$180-300" />
            <PriceRow cat="Lighting" budget="$25-45" mid="$50-90" premium="$110-180" />
            <PriceRow cat="Decor" budget="$50-90" mid="$120-220" premium="$280-450" />
            <PriceRow cat="Bath" budget="$35-60" mid="$70-120" premium="$140-220" />
            <PriceRow cat="Essentials and hardware" budget="$45-75" mid="$90-140" premium="$160-240" />
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-ink/15">
              <th scope="row" className="py-3 pl-5 pr-4 text-left text-sm font-bold text-ink">
                Rough total
              </th>
              <td className="py-3 pr-4 text-right font-mono text-sm font-semibold text-ink">
                $300-450
              </td>
              <td className="py-3 pr-4 text-right font-mono text-sm font-semibold text-ink">
                $600-1,000
              </td>
              <td className="py-3 pr-5 text-right font-mono text-sm font-semibold text-ink">
                $1,200+
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <P>
        Those totals leave out shared big-ticket items on purpose. A mini fridge
        runs $90 to $250, a microwave $60 to $120, and a storage trunk $40 to
        $90. Most roommates split these, so budget for half of one fridge, not a
        whole one.
      </P>

      <H2>Where the money actually goes</H2>

      <H3>Bedding and sleep: spend here</H3>
      <P>
        This is the category worth stretching for, because you spend a third of
        college horizontal on it. A budget setup is twin XL sheets, a comforter,
        and one pillow. The mid tier adds a two to three inch mattress topper and
        a mattress protector, which is the upgrade people notice most. Premium is
        a down or hybrid topper, a duvet with a washable cover, and a second
        pillow. Save on the comforter, splurge on the topper.
      </P>

      <H3>Decor: the widest range</H3>
      <P>
        Decor spans the biggest gap between tiers because it’s where taste lives.
        Budget is a small rug and a few prints with adhesive hooks. Mid adds a
        larger rug with a pad, framed prints, string lights, and a plant or two.
        Premium is a statement rug, a tapestry or gallery wall, real frames, and
        a lamp that sets the mood. You can spend $50 or $450 here and both can
        look intentional.
      </P>

      <H3>Storage, lighting, and hardware: stay cheap</H3>
      <P>
        These three barely move. Under-bed bins, a closet organizer, and a small
        drawer cart cover almost everyone. A clip lamp and a warm floor lamp beat
        the overhead fluorescents for under $50. Hardware, the surge protector,
        command strips, a drying rack, a fan, and a trash can, is unglamorous and
        cheap. Don’t overthink it, and don’t skip the{" "}
        <TextLink href="/blog/dorm-packing-list-nobody-gives-you">
          small items everyone forgets
        </TextLink>
        .
      </P>

      <H2>How to spend less without it looking cheap</H2>
      <Ul>
        <Li>
          Split the big stuff. One fridge, one microwave, and one rug per room,
          not per person.
        </Li>
        <Li>
          Buy the topper and sheets new, buy storage and decor on sale. Bins and
          lamps go on deep discount every August.
        </Li>
        <Li>
          Measure before you buy so nothing gets returned. A rug that doesn’t fit
          is a full refund of wasted effort. Start with{" "}
          <TextLink href="/blog/how-to-measure-your-dorm-room">
            how to measure your dorm room
          </TextLink>
          .
        </Li>
        <Li>
          Set a number first and shop against it. It’s far easier to fill a $500
          plan than to add up a cart and flinch.
        </Li>
      </Ul>

      <Callout label="Budget first, by design">
        <p>
          Dormscape works backward from your number. Set a budget, and the plan
          stays inside it: real products that fit your exact room, with the total
          visible as you build. See whether your school is on{" "}
          <TextLink href="/colleges">our list of colleges</TextLink>, then{" "}
          <TextLink href="/plan">plan a room that respects the budget</TextLink>.
        </p>
      </Callout>

      <EndCTA>Pick your number. We’ll build the room around it.</EndCTA>
    </>
  );
}

const post: BlogPost = {
  slug: "how-much-does-a-dorm-room-cost",
  title: "How much does it actually cost to set up a dorm room in 2026",
  metaTitle: "How Much Does a Dorm Room Cost to Set Up in 2026?",
  description:
    "A realistic 2026 dorm budget by category, with budget, mid, and premium price ranges for bedding, storage, lighting, decor, bath, and essentials.",
  excerpt:
    "A realistic 2026 budget by category, with budget, mid, and premium ranges. Where the money actually goes, and how to spend less without it looking cheap.",
  date: "2026-07-22",
  updated: "2026-07-27",
  readingTimeMin: 6,
  faqs: [
    {
      q: "How much does it cost to set up a dorm room in 2026?",
      a: "A per-student setup runs roughly $300 to $450 on a budget, $600 to $1,000 for a comfortable mid-range, and $1,200 or more for premium, before shared big-ticket items like a mini fridge or microwave. Bedding and decor drive most of the difference between tiers.",
    },
    {
      q: "What is the most expensive part of setting up a dorm room?",
      a: "Bedding and decor. Sleep gear like a mattress topper, protector, and quality bedding can run $300 or more at the premium tier, and decor spans the widest range because it depends entirely on taste. Storage, lighting, and hardware stay inexpensive at every tier.",
    },
    {
      q: "How can I set up a dorm room cheaply?",
      a: "Split big-ticket items with roommates, buy storage and decor on August sales, set a fixed budget before shopping, and measure the room first so nothing gets returned. A careful budget setup lands around $300 to $450 and still looks intentional.",
    },
    {
      q: "Should roommates split dorm purchases?",
      a: "Yes, for shared big-ticket items. One mini fridge, one microwave, and one rug per room saves each person real money and floor space. Keep personal items like bedding, towels, and storage separate.",
    },
  ],
  Body,
};

export default post;
