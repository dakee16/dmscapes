import Link from "next/link";
import FeedbackLink from "@/components/site/FeedbackLink";

const COLUMNS: {
  heading: string;
  // placeholder routes 404 on purpose; skip prefetch so they don't spam the console
  links: {
    label: string;
    href?: string;
    external?: boolean;
    placeholder?: boolean;
    // Opens the standalone feedback modal instead of navigating.
    feedback?: boolean;
  }[];
}[] = [
  {
    heading: "Product",
    links: [
      { label: "How it works", href: "/#how-it-works" },
      { label: "Vibes & styles", href: "/#vibes" },
      { label: "Colleges", href: "/colleges" },
      { label: "Pricing", href: "/pricing" },
      { label: "Room in 3D", href: "/pricing" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
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
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
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
    <footer className="relative overflow-hidden border-t border-ink/8 bg-paper">
      <div className="relative z-10 mx-auto max-w-6xl px-5 pb-44 pt-12 sm:px-8 sm:pb-60 sm:pt-14">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
                {col.heading}
              </p>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.feedback ? (
                      <FeedbackLink />
                    ) : link.external ? (
                      <a
                        href={link.href}
                        className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                      >
                        {link.label}
                      </a>
                    ) : (
                      <Link
                        href={link.href ?? "#"}
                        prefetch={link.placeholder ? false : undefined}
                        className="text-sm font-medium text-ink-soft transition-colors hover:text-ink"
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
            <p className="font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              Social
            </p>
            <ul className="mt-4 space-y-2.5">
              <li>
                <a
                  href="https://tiktok.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  <TikTokIcon />
                  TikTok
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
                >
                  <InstagramIcon />
                  Instagram
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-ink/8 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/icons/icon-512.png"
                alt=""
                width={28}
                height={28}
                className="h-7 w-7 shrink-0 rounded-lg border border-ink/10"
              />
              <p className="font-display text-lg font-bold tracking-tight">
                dorm<span className="text-amber">scape</span>
              </p>
            </div>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-wide text-ink-soft">
              Dorm ready under a minute.
            </p>
          </div>
          <p className="text-xs text-ink-soft">© 2026 Dormscape</p>
        </div>
      </div>

      {/* Oversized brand signature, bleeding off the bottom edge. The site's
          wordmark treatment (ink "dorm" + amber "scape") at a much larger scale
          and low opacity, cropped by the footer, so it reads as a watermark
          behind the functional content rather than competing with it. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 flex justify-center overflow-hidden"
      >
        <span className="translate-y-[30%] select-none whitespace-nowrap font-display text-[clamp(7rem,27vw,20rem)] font-extrabold leading-none tracking-tight text-ink opacity-[0.06]">
          dorm<span className="text-amber opacity-80">scape</span>
        </span>
      </div>
    </footer>
  );
}
