import Link from "next/link";
import Wordmark from "@/components/site/Wordmark";
import { MotionToggle } from "@/components/experience/MotionProvider";
import FeedbackLink from "@/components/site/FeedbackLink";
import s from "./ds/SiteFooter.module.css";

const COLUMNS: {
  heading: string;
  links: { label: string; href?: string; anchor?: boolean; external?: boolean; feedback?: boolean }[];
}[] = [
  {
    heading: "Product",
    links: [
      { label: "My designs", href: "/rooms" },
      { label: "My Room (Pro)", href: "/my-room" },
      { label: "How it works", href: "/#how-it-works", anchor: true },
      { label: "Vibes & styles", href: "/#vibes", anchor: true },
      { label: "Colleges", href: "/colleges" },
      { label: "Pricing", href: "/pricing" },
      { label: "Room in 3D", href: "/#room-in-3d", anchor: true },
      { label: "3D Room Builder", href: "/plan/draw/3d" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "How we measure", href: "/methodology" },
      { label: "Blog", href: "/blog" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
      { label: "Feedback", feedback: true },
      { label: "Report a problem", href: "/report" },
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
  {
    heading: "Social",
    links: [
      { label: "TikTok", href: "https://tiktok.com/@dorm.scape", external: true },
      { label: "Instagram", href: "https://www.instagram.com/dorm.scape", external: true },
    ],
  },
];

export default function Footer() {
  return (
    <footer className={`ds ${s.footer}`}>
      <div className={s.tape} aria-hidden="true" />
      <div className={s.inner}>
        <div className={s.brand}>
          <p className={s.motto}>
            Measure. Imagine.
            <br />
            Make room.
          </p>
          <p className={s.tagline}>Your next chapter, planned.</p>
        </div>
        <nav className={s.columns} aria-label="Footer">
          {COLUMNS.map((col) => (
            <div key={col.heading} className={s.col}>
              <h2 className={s.colHead}>{col.heading}</h2>
              <ul>
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.feedback ? (
                      <FeedbackLink />
                    ) : link.external ? (
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        {link.label} <span aria-hidden="true">↗</span>
                      </a>
                    ) : link.anchor ? (
                      <a href={link.href}>{link.label}</a>
                    ) : (
                      <Link href={link.href ?? "#"}>{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className={s.bottom}>
          <Wordmark tone="dark" />
          <p className={s.legal}>
            © 2026 Dormscape · <Link href="/methodology">Built on official housing data</Link>
          </p>
          <div className={s.motion}>
            <MotionToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
