import Wordmark from "@/components/site/Wordmark";
import { MotionToggle } from "@/components/experience/MotionProvider";
import Link from "next/link";
import FeedbackLink from "@/components/site/FeedbackLink";

const COLUMNS: {
  heading: string;
  // placeholder routes 404 on purpose; skip prefetch so they don't spam the console
  links: {
    label: string;
    href?: string;
    external?: boolean;
    anchor?: boolean;
    placeholder?: boolean;
    // Opens the standalone feedback modal instead of navigating.
    feedback?: boolean;
  }[];
}[] = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works", anchor: true },
      { label: "Vibes & styles", href: "/#vibes", anchor: true },
      { label: "Colleges", href: "/colleges" },
      { label: "Pricing", href: "/pricing" },
      { label: "Room in 3D", href: "/pricing#room-in-3d", anchor: true },
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
];

function TikTokIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M19.6 7.2a5.3 5.3 0 0 1-3.1-1V15a5.6 5.6 0 1 1-5.6-5.6c.3 0 .6 0 .9.1v2.9a2.7 2.7 0 1 0 1.9 2.6V2.5h2.8a5.3 5.3 0 0 0 3.1 4v.7z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.2" cy="6.8" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="dm-footer">
      <div className="dm-footer-grid">
        <div className="dm-footer-brand">
          <Wordmark />
          <p>Dorm ready under a minute.</p>
          <small>© 2026 Dormscape</small>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <h2 className="dm-eyebrow">{col.heading}</h2>
            <ul>
              {col.links.map((link) => (
                <li key={link.label}>
                  {link.feedback ? (
                    <FeedbackLink />
                  ) : link.external || link.anchor ? (
                    <a href={link.href}>{link.label}</a>
                  ) : (
                    <Link
                      href={link.href ?? "#"}
                      prefetch={link.placeholder ? false : undefined}
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <h2 className="dm-eyebrow">Social</h2>
          <ul>
            <li>
              <a
                href="https://tiktok.com/@dorm.scape"
                target="_blank"
                rel="noopener noreferrer"
              >
                <TikTokIcon />
                TikTok <span aria-hidden="true">↗</span>
              </a>
            </li>
            <li>
              <a
                href="https://www.instagram.com/dorm.scape"
                target="_blank"
                rel="noopener noreferrer"
              >
                <InstagramIcon />
                Instagram <span aria-hidden="true">↗</span>
              </a>
            </li>
          </ul>
          <MotionToggle />
        </div>
      </div>
    </footer>
  );
}
