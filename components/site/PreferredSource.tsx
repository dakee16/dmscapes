import Image from "next/image";

// Google's "Add as a preferred source" badge (Google's own artwork, from the Search Central guide to preferred
// sources), as the plain link the guide offers: no Google script on our pages, so nothing to add to the CSP or to
// the cookie banner. Readers who pick dormscape see more of it in their Top Stories, AI Overviews and AI Mode.
const HREF = "https://www.google.com/preferences/source?q=dormscape.us";

export default function PreferredSource({ tone, className }: { tone: "light" | "dark"; className?: string }) {
  return (
    <a href={HREF} target="_blank" rel="noopener" className={className}>
      <Image
        src={`/google-preferred-source-${tone}.png`}
        width={190}
        height={60}
        quality={90}
        alt="Add dormscape as a preferred source on Google"
      />
    </a>
  );
}
