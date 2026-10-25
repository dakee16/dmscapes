import type { BlogPost } from "./types";
import { Lead, H2, P, Ul, Ol, Li, Callout, EndCTA, TextLink } from "@/components/blog/Prose";
import { PILOT_SCHOOLS } from "@/lib/hall-finder";
import { getSchool } from "@/lib/schools";
import { shortName } from "@/lib/school-names";
import { PLUS_INITIAL_CREDITS, PLUS_PRICE_USD, PRO_PRICE_USD } from "@/lib/plan";

// Hall Finder's schools and prices come from the data and lib/plan, never from this text.
const PILOTS = PILOT_SCHOOLS.map((id) => getSchool(id)).filter((s) => s !== undefined).map((s) => ({ id: s.id, short: shortName(s) }));
const SCHOOLS = PILOTS.map((s) => s.short);
const schoolList = SCHOOLS.length > 1 ? `${SCHOOLS.slice(0, -1).join(", ")} and ${SCHOOLS.at(-1)}` : (SCHOOLS[0] ?? "");
const usd = (n: number) => `$${n.toFixed(2)}`;

function Body() {
  return (
    <>
      <Lead>
        The hall you pick decides how far you walk every single day. Two halls
        that look the same on a housing site can be ten minutes apart from the
        buildings you actually have class in: there and back five days a week,
        that&rsquo;s 100 minutes.
        Hall Finder works it out from your own schedule: add your classes, and
        it ranks your school&rsquo;s halls by how long you&rsquo;d walk each
        week, with the real walking routes on a map.
      </Lead>

      <H2>What Hall Finder does</H2>
      <P>
        You tell it where you need to be and on which days. It works out the
        walk from every residence hall to each of those places, adds up the week,
        and puts the halls in order, shortest week first. Then you can plan the
        room in the hall you pick, straight from the results.
      </P>
      <P>
        It works today at{" "}
        {PILOTS.map((s, i) => (
          <span key={s.id}>
            {i > 0 && (i === PILOTS.length - 1 ? " and " : ", ")}
            <TextLink href={`/colleges/${s.id}/hall-finder`}>{s.short}</TextLink>
          </span>
        ))}
        . Open <TextLink href="/hall-finder">Hall Finder</TextLink> and choose
        your school.
      </P>

      <H2>Add your classes</H2>
      <Ul>
        <Li>
          <strong>Upload your schedule.</strong>{" "}A calendar file (.ics) from
          your school portal, Google Calendar or Apple Calendar is read right in
          your browser and never uploaded. A screenshot or PDF of your schedule
          works too once you have a free account: we read the class names,
          days, times and rooms, then show you what we found so you can check it.
        </Li>
        <Li>
          <strong>Or add buildings by hand.</strong>{" "}Search by name or by the
          short code on your schedule, like WILLARD or OSM, and tap the days
          you go: M, T, W, Th, F.
        </Li>
        <Li>
          <strong>Add the rest of your week.</strong>{" "}Quick adds find a
          library, gym or dining hall to add, and you can drop a pin anywhere
          else you go often, like a job or a practice field.
        </Li>
        <Li>
          <strong>Narrow it down.</strong>{" "}Only show halls with AC, singles or
          doubles, or first-year halls where the school says which halls are
          for first-years.
        </Li>
      </Ul>
      <P>
        Nothing from a screenshot is added on a guess. Every class shows the
        room text we read and the building it matched; anything we weren&rsquo;t
        sure about asks you first.
      </P>

      <H2>How the minutes are counted</H2>
      <P>
        Walks follow real paths and sidewalks from OpenStreetMap, door to door,
        at an average walking pace of about 3 mph. A week&rsquo;s walk is, for
        each place, the days you go times the one-way walk times two. It
        doesn&rsquo;t count buses, waiting at crossings or the order of your
        classes, so treat it as a fair way to compare halls rather than a
        stopwatch. The details are on{" "}
        <TextLink href="/methodology#walk-times">how we measure</TextLink>.
      </P>

      <H2>What you get, free and with Plus</H2>
      <P>
        Adding places is open to everyone. Seeing results takes a free account,
        and everything you entered is kept through signing in.
      </P>
      <Ul>
        <Li>
          <strong>Free account:</strong>{" "}your #1 hall, its weekly walk, the
          minutes to each of your places, and one walking route on the map.
        </Li>
        <Li>
          <strong>Plus ({usd(PLUS_PRICE_USD)} once) and Pro ({usd(PRO_PRICE_USD)} once):</strong>{" "}every
          hall ranked, every route, two halls compared side by side, and setups
          you can save and share with a link. Plus also includes {PLUS_INITIAL_CREDITS} plan
          credits; see <TextLink href="/pricing">pricing</TextLink> for the rest.
        </Li>
        <Li>
          <strong>Pro:</strong>{" "}also compares halls with your roommates in My
          Room (below).
        </Li>
      </Ul>

      <H2>Already looking at a hall?</H2>
      <P>
        Hall pages at these schools show the walk from the front door to the
        nearest dining hall, library and gym, where the campus data has them,
        with a map. That part
        is free and doesn&rsquo;t need an account. From there, &ldquo;Got your
        class schedule?&rdquo; opens Hall Finder with that hall ready to compare
        against your best match.
      </P>

      <H2>Choosing with roommates</H2>
      <P>
        Picking a hall with friends? Open a shared room in{" "}
        <TextLink href="/my-room">My Room</TextLink>. Its Halls view lets each
        of you add your own classes, the same way as in Hall Finder, and ranks
        the halls for everyone two ways:
      </P>
      <Ul>
        <Li>
          <strong>Least walking together:</strong>{" "}the hall where your weeks
          add up to the fewest minutes.
        </Li>
        <Li>
          <strong>Fairest split:</strong>{" "}the hall where whoever walks the
          most walks the least, so one person doesn&rsquo;t get the long walk
          every day.
        </Li>
      </Ul>
      <P>
        Each hall shows everyone&rsquo;s week side by side, and picking one draws
        each person&rsquo;s routes on the map in their colour. Roommates see each
        other&rsquo;s buildings and days, not course names or where a pin was
        dropped. It works in a room hosted on Pro; roommates don&rsquo;t need Pro
        to join.
      </P>

      <H2>Use it to rank, then plan</H2>
      <Ol>
        <Li>Add your classes and the places you go every week.</Li>
        <Li>Rank the halls and look at the top few, not just the first.</Li>
        <Li>Weigh the walk against what else matters: AC, room size, your friends.</Li>
        <Li>Put your choices in order on your housing application.</Li>
        <Li>
          Once you know your hall, plan the room. The finder links straight
          into the <TextLink href="/plan">room planner</TextLink> with that hall
          picked.
        </Li>
      </Ol>

      <H2>Where the data comes from</H2>
      <P>
        Walking routes use data from{" "}
        <TextLink href="https://www.openstreetmap.org/copyright" external>OpenStreetMap contributors</TextLink>{" "}
        (ODbL), and the map is served by{" "}
        <TextLink href="https://openfreemap.org" external>OpenFreeMap</TextLink>.
        Building names and codes come from each school&rsquo;s registrar or
        housing office. Each school&rsquo;s Hall Finder page lists its sources
        and the date its walking data was last built.
      </P>

      <Callout label="Good to know">
        <p>
          Most schools assign rooms, so a ranking doesn&rsquo;t guarantee a hall.
          It helps you put your preferences in order with real numbers instead
          of guesses. Your places stay in your browser unless you save a setup
          or add them to a shared room;
          the <TextLink href="/privacy">privacy policy</TextLink> has the details.
        </p>
      </Callout>

      <EndCTA href="/hall-finder" cta="Find my hall">
        Add your classes and see which hall is closest to your week.
      </EndCTA>
    </>
  );
}

const post: BlogPost = {
  slug: "find-the-dorm-closest-to-your-classes",
  title: "How to find the dorm closest to your classes",
  metaTitle: "Find the Dorm Closest to Your Classes",
  description:
    "Rank your school's residence halls by how long you'd walk to class each week. Upload your schedule or add classes, and see real walking routes.",
  excerpt:
    "Upload your schedule or add your classes, and Hall Finder ranks every hall by your weekly walk, with real routes on the map.",
  date: "2026-10-24",
  readingTimeMin: 5,
  faqTopic: "Hall Finder",
  faqs: [
    {
      q: "How do I find the dorm closest to my classes?",
      a: `Open Hall Finder, choose your school and add the buildings you have class in with the days you go, or upload your schedule. It ranks every residence hall by your total walking time for the week, shortest first, and shows the walking routes on a map. It works at ${schoolList}.`,
    },
    {
      q: "Which schools does Hall Finder work at?",
      a: `Hall Finder works at ${schoolList}. More schools are being added; every school still has its room sizes and planner on dormscape.`,
    },
    {
      q: "Can I upload my class schedule?",
      a: "Yes. A calendar file (.ics) from your school portal, Google Calendar or Apple Calendar is read in your browser and never uploaded. With a free account you can also upload a screenshot or PDF of your schedule, up to 3 pages. Either way you check the classes and buildings it found before anything is added.",
    },
    {
      q: "What happens to my schedule screenshot?",
      a: "It is sent to Anthropic, dormscape's AI provider, to read the class names, days, times and rooms. dormscape processes it in memory and does not store the file or the text read from it. Only the classes you confirm are added to your places.",
    },
    {
      q: "How does Hall Finder count walking time?",
      a: "Walks follow real paths and sidewalks from OpenStreetMap, door to door, at an average pace of about 3 mph. A week's walk is, for each place, the days you go times the one-way walk times two. It does not include buses, waits at crossings or the order of your classes.",
    },
    {
      q: "Is Hall Finder free?",
      a: `Adding places is free for everyone, and a free account shows your #1 hall, its weekly walk, the minutes to each place and one walking route. Plus (${usd(PLUS_PRICE_USD)} once) and Pro (${usd(PRO_PRICE_USD)} once) rank every hall, show every route, compare two halls side by side, and let you save and share setups.`,
    },
    {
      q: "Can my roommates and I compare halls together?",
      a: `Yes. In a shared My Room hosted on Pro (${usd(PRO_PRICE_USD)} once), the Halls view lets each roommate add their own classes, then ranks the halls by your combined walk or by the fairest split, where whoever walks the most walks the least. Roommates see each other's buildings and days, not course names, and don't need Pro to join.`,
    },
    {
      q: "Can I see walk times for a hall without signing in?",
      a: "Yes. At Hall Finder schools, hall pages show the walk from the front door to the nearest dining hall, library and gym, where the campus data has them, with a map. It is free and needs no account.",
    },
    {
      q: "Does Hall Finder guarantee I get the hall it ranks first?",
      a: "No. Most schools assign rooms, so Hall Finder helps you rank your housing preferences with real walking times. It does not affect your school's housing assignment.",
    },
  ],
  Body,
};

export default post;
