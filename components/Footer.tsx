import Link from "next/link";
import Wordmark from "@/components/site/Wordmark";
import { MotionToggle } from "@/components/experience/MotionProvider";
import FeedbackLink from "@/components/site/FeedbackLink";
import { FooterLink as HallFinderLink } from "@/components/hall-finder/Entry";
import SocialLinks from "@/components/ds/SocialLinks";
import AskAi from "@/components/site/AskAi";
import { POPULAR_SCHOOLS } from "@/lib/popular-schools";
import { COMPARE_NAMES } from "@/lib/compare-names";
import s from "./ds/SiteFooter.module.css";

type FooterLinkItem = { label: string; href?: string; anchor?: boolean; feedback?: boolean; hallFinder?: boolean };
type Group = { heading: string; links: FooterLinkItem[] };

// Five columns; a column can stack two short groups. The footer also renders on a
// few client pages (via PageShell), so it only imports small lists, not the school index.
const COLUMNS: Group[][] = [
  [
    {
      heading: "Plan",
      links: [
        { label: "Plan my room", href: "/plan" },
        { label: "Dorm room planner", href: "/dorm-room-planner" },
        { label: "Draw your room", href: "/plan/draw" },
        { label: "3D Room Builder", href: "/plan/draw/3d" },
        { label: "My designs", href: "/rooms" },
        { label: "My Room (Pro)", href: "/my-room" },
        { label: "Hall Finder", hallFinder: true },
        { label: "Pricing", href: "/pricing" },
      ],
    },
  ],
  [
    {
      heading: "Guides & tools",
      links: [
        { label: "Dorm room sizes", href: "/dorm-room-size" },
        { label: "Loft & bunk rules", href: "/dorm-bed-rules" },
        { label: "Rug size calculator", href: "/dorm-rug-size" },
        { label: "Under-loft clearance", href: "/loft-bed-clearance" },
        { label: "Twin XL sheets", href: "/twin-xl-sheets" },
        { label: "Room guides", href: "/blog" },
        { label: "FAQ", href: "/faq" },
      ],
    },
  ],
  [
    {
      heading: "Colleges",
      links: [
        { label: "All colleges", href: "/colleges" },
        ...POPULAR_SCHOOLS.map((c) => ({ label: c.name, href: `/colleges/${c.id}` })),
        { label: "Add your school", href: "/add-school" },
      ],
    },
  ],
  [
    {
      heading: "Compare",
      links: [
        ...COMPARE_NAMES.map((c) => ({ label: `dormscape vs ${c.name}`, href: `/compare/${c.slug}` })),
        { label: "All comparisons", href: "/compare" },
      ],
    },
    {
      heading: "Company",
      links: [
        { label: "About", href: "/about" },
        { label: "How we measure", href: "/methodology" },
        { label: "Contact", href: "/contact" },
        { label: "Feedback", feedback: true },
        { label: "Report a problem", href: "/report" },
      ],
    },
  ],
  [
    {
      heading: "On the homepage",
      links: [
        { label: "How it works", href: "/#how-it-works", anchor: true },
        { label: "Vibes & styles", href: "/#vibes", anchor: true },
        { label: "Room in 3D", href: "/#room-in-3d", anchor: true },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Terms of Service", href: "/terms" },
        { label: "Privacy Policy", href: "/privacy" },
        { label: "Cookie Policy", href: "/cookies" },
      ],
    },
  ],
];

export default function Footer() {
  return (
    <footer className={`ds ${s.footer}`}>
      <div className={s.tape} aria-hidden="true" />
      <div className={s.inner}>
        <div className={s.top}>
          <div className={s.brand}>
            <p className={s.motto}>
              Measure. Imagine.
              <br />
              Make room.
            </p>
            <p className={s.tagline}>Your next chapter, planned.</p>
          </div>
          <div className={s.side}>
            <p className={s.sideHead}>Follow dormscape</p>
            <SocialLinks />
            <p className={s.sideHead}>Ask AI about dormscape</p>
            <AskAi />
          </div>
        </div>
        <nav className={s.columns} aria-label="Footer">
          {COLUMNS.map((groups) => (
            <div key={groups[0].heading} className={s.col}>
              {groups.map((group) => (
                <div key={group.heading}>
                  <h2 className={s.colHead}>{group.heading}</h2>
                  <ul>
                    {group.links.map((link) =>
                      link.hallFinder ? (
                        <HallFinderLink key={link.label} />
                      ) : (
                        <li key={link.label}>
                          {link.feedback ? (
                            <FeedbackLink />
                          ) : link.anchor ? (
                            <a href={link.href}>{link.label}</a>
                          ) : (
                            <Link href={link.href ?? "#"}>{link.label}</Link>
                          )}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              ))}
            </div>
          ))}
        </nav>
        <div className={s.bottom}>
          <Wordmark tone="dark" />
          <p className={s.legal}>
            © 2026 dormscape · <Link href="/methodology">Built on official housing data</Link>
          </p>
          <div className={s.motion}>
            <MotionToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
