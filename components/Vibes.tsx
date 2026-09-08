import Link from "next/link";
import StyleGallery from "@/components/experience/StyleGallery";
import Reveal from "@/components/site/Reveal";
import StyleScene from "@/components/site/StyleScene";
import type { StyleId } from "@/lib/types";

const VIBES: {
  id: StyleId;
  name: string;
  line: string;
  who: string;
  plus?: boolean;
}[] = [
  {
    id: "minimalist",
    name: "Minimalist",
    line: "Clean lines, empty desk, nothing you don't need.",
    who: "For the clean-desk devotee",
  },
  {
    id: "cozy",
    name: "Cozy Aesthetic",
    line: "Warm light, soft layers, film photos on string.",
    who: "For the incurable homebody",
  },
  {
    id: "preppy",
    name: "Preppy",
    line: "Stripes, monograms, made-bed energy.",
    who: "For the always put together",
  },
  {
    id: "academia",
    name: "Academia",
    line: "Warm library light, plaid, brass, and old books.",
    who: "For the library romantic",
    plus: true,
  },
  {
    id: "y2k",
    name: "Y2K Cyber",
    line: "Chrome, holo posters, butterfly-clip everything.",
    who: "For the nostalgia maximalist",
    plus: true,
  },
  {
    id: "gamer",
    name: "Gamer",
    line: "Dual glow, clean cable runs, zero screen glare.",
    who: "For the gamer who still wants it to look good",
    plus: true,
  },
  {
    id: "team_spirit",
    name: "Team Spirit",
    line: "Varsity stripes, color-block, game-day ready.",
    who: "For the diehard superfan",
    plus: true,
  },
  {
    id: "retro",
    name: "Retro",
    line: "Mustard and rust, groovy shapes, 70s warmth.",
    who: "For the born-in-the-wrong-decade type",
    plus: true,
  },
  {
    id: "pastel",
    name: "Pastel",
    line: "Soft pinks, plush everything, gently unserious.",
    who: "For the soft-serve dreamer",
    plus: true,
  },
];

export default function Vibes() {
  return (
    <section id="vibes" className="dm-vibes-section">
      <Reveal className="dm-vibes-heading dm-section">
        <div>
          <p className="dm-eyebrow">03 / Style showcase</p>
          <h2>
            Pick a vibe.
            <br />
            <em>We make it fit.</em>
          </h2>
        </div>
        <div>
          <p>
            Every vibe is a full plan: bedding, lighting, storage, and decor,
            priced to your budget and arranged to your floor plan.
          </p>
          <span className="dm-eyebrow">09 styles / One very you room</span>
        </div>
      </Reveal>
      <StyleGallery count={VIBES.length}>
        {VIBES.map((vibe, i) => (
          <article key={vibe.id} className="dm-vibe-card" data-vibe={vibe.id}>
            <div className="dm-vibe-card-top">
              <span className="dm-eyebrow">
                {String(i + 1).padStart(2, "0")} / {vibe.name}
              </span>
              {vibe.plus && <span className="dm-yellow-tag">Plus</span>}
            </div>
            <StyleScene id={vibe.id} className="dm-vibe-scene" />
            <div className="dm-vibe-card-copy">
              <h3>{vibe.name}</h3>
              <p>{vibe.line}</p>
              <span className="dm-eyebrow">{vibe.who}</span>
              <Link href="/plan" aria-label={`Plan a ${vibe.name} room`}>
                Explore this vibe <span aria-hidden="true">↗</span>
              </Link>
            </div>
          </article>
        ))}
      </StyleGallery>
    </section>
  );
}
