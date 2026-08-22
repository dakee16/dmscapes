import type { BlogPost } from "./types";
import { Lead, H2, P, Ul, Li, Callout, EndCTA, TextLink } from "@/components/blog/Prose";

function Body() {
  return (
    <>
      <Lead>
        The hard part of a good dorm room usually isn’t taste. It’s translation:
        turning a feeling in your head into choices specific enough to actually
        shop. “Cozy” and “aesthetic” don’t buy anything. Colors, textures, and a
        mood do. Dormscape’s Create your own vibe reads a plain description and
        matches real products to it, so the better you describe the room, the
        better the room you get back. Here’s how to put a vibe into words.
      </Lead>

      <H2>Name colors, not adjectives</H2>
      <P>
        “Nice,” “clean,” and “warm” are feelings, not palettes. Two or three named
        colors give a matcher something to work with. “Soft sage and cream with
        warm wood” points somewhere. “Something cute” points nowhere. If you change
        only one thing about how you describe a room, make it this.
      </P>

      <H2>Pick a material or two</H2>
      <P>
        Texture carries a vibe as much as color does. Linen reads calm and coastal.
        Oak and rattan read warm and natural. Chrome and glossy black read gamer or
        Y2K. Velvet and brass read academia. You don’t need a full spec sheet, just
        one or two materials that anchor the feeling.
      </P>

      <H2>Add a mood or a reference</H2>
      <P>
        A named mood is a shortcut that carries a whole palette with it. “Coastal
        grandmother,” “dark academia,” “cottagecore,” and “blackout gamer
        battlestation” each imply colors and textures at once. Reference the vibe
        you already picture, then add the couple of specifics that make it yours.
      </P>

      <H2>What a good description looks like</H2>
      <P>
        You don’t need a paragraph. A sentence or two with a color, a texture, and a
        mood is plenty.
      </P>
      <Ul>
        <Li>“Coastal grandmother energy, lots of linen and soft blues.”</Li>
        <Li>“Warm minimalist with oak, cream, and a single big plant.”</Li>
        <Li>“Dark academia, leather and brass, deep green.”</Li>
        <Li>“Chrome and neon gamer battlestation, all blackout.”</Li>
      </Ul>
      <P>
        If a description reads like a room, it’ll match like one. If it reads like a
        to-do list (“cheap, fast, good”), it won’t, and Dormscape will nudge you to
        add colors, textures, or a mood before it builds.
      </P>

      <H2>How Create your own vibe uses it</H2>
      <P>
        Create your own vibe is the Pro version of picking a style. Instead of
        choosing one of the nine presets, you describe any aesthetic in your own
        words. Dormscape interprets it, matches real products across every category,
        keeps the total inside the budget you set, and lays the room out to your
        exact dimensions, the same way the preset vibes do. While you’re deciding,
        the nine preset styles make a good starting vocabulary; see{" "}
        <TextLink href="/blog/how-to-pick-a-dorm-room-style">
          how to pick a dorm room style
        </TextLink>
        .
      </P>

      <Callout label="Describe it, then build it">
        <p>
          Create your own vibe is a <TextLink href="/pricing">Pro</TextLink>{" "}
          feature. Set your room and budget, describe the look in a sentence or two,
          and{" "}
          <TextLink href="/plan">plan the room around your words</TextLink>. The
          clearer the description, the closer the match.
        </p>
      </Callout>

      <EndCTA>Put your room into words. Get it back as a plan.</EndCTA>
    </>
  );
}

const post: BlogPost = {
  slug: "describe-your-dorm-room-in-words",
  title: "How to describe your dorm room in words",
  metaTitle: "How to Describe Your Dorm Room Aesthetic",
  description:
    "Turn a feeling into a room. Describe your dorm aesthetic with colors, textures, and a mood so you get products that actually match your vibe.",
  excerpt:
    "The hard part of a good room is translation: turning a vibe in your head into colors, textures, and a mood specific enough to shop. Here’s how.",
  date: "2026-08-21",
  readingTimeMin: 5,
  faqTopic: "Create your own vibe",
  faqs: [
    {
      q: "What is Create your own vibe on Dormscape?",
      a: "Create your own vibe is a Pro feature that lets you describe any room aesthetic in your own words instead of picking one of the nine preset styles. Dormscape reads your description, matches real products to it across every category, keeps the total inside your budget, and lays the room out to your exact dimensions.",
    },
    {
      q: "How do I describe a dorm room aesthetic so it matches well?",
      a: "Name specific colors instead of adjectives (soft sage and cream, not just nice), call out one or two materials or textures (linen, oak, chrome, velvet), and add a mood or a reference like coastal grandmother or dark academia. A sentence or two with those three ingredients is enough for a good match.",
    },
    {
      q: "Do I need Pro to create my own vibe?",
      a: "Yes. The nine preset styles are available on the free and paid plans, but describing your own vibe in free text is a Pro feature. Pro is a one-time $19.99 unlock that also includes unlimited plans, every preset vibe, PDF and PNG export, and side-by-side comparison.",
    },
  ],
  Body,
};

export default post;
