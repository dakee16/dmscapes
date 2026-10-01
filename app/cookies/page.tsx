import Footer from "@/components/Footer";
import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "@/components/site/SiteHeader";

// Structural draft reflecting Dormscape's actual use of cookies and browser
// storage (sign-in, planner recovery, collaboration and analytics) as of this
// writing. Have a legal professional (or a service like Termly/iubenda)
// review this before treating it as final, binding legal text, especially
// before scaling to meaningful user volume.

export const metadata: Metadata = {
  description:
    "Dormscape's cookie policy: sign-in, room drafts, workspace recovery, live collaboration, voice connections, analytics, and browser storage choices.",
};

const TEXT_LINK =
  "font-semibold text-ink underline decoration-highlight decoration-2 underline-offset-4 transition-colors hover:text-cobalt";

export default function CookiesPage() {
  return (
    <div>
      <SiteHeader />
      <main id="page-content" tabIndex={-1} className="dm-page dm-legal-page">
        <div className="mx-auto max-w-[50rem] px-5 py-14 sm:px-8 sm:py-20">
          <p className="font-mono text-xs font-medium uppercase tracking-[0.18em] text-ink-soft">
            Legal
          </p>
          <h1 className="dm-page-title mt-3 font-display text-4xl font-extrabold tracking-tight">
            Cookie Policy
          </h1>
          <p className="mt-2 font-mono text-sm text-ink-soft">
            Last updated: September 30, 2026
          </p>
          <p className="mt-6 text-lg leading-relaxed text-ink-soft">
            Cookies are small pieces of data a site stores in your browser. Dormscape
            also uses local storage, session storage and temporary in-memory state.
            This page explains how these support planning, shared rooms and optional
            voice, and how to manage them. Dormscape does not use advertising or
            retargeting cookies.
          </p>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Sign-in and room progress
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              These keep the basic site working.
            </p>
            <ul className="mt-4 space-y-4 text-base leading-relaxed text-ink-soft">
              <li>
                <span className="font-semibold text-ink">Sign-in session.</span>{" "}If you
                create an account, your sign-in session is kept in your browser&rsquo;s
                local storage so you stay signed in between visits. This isn&rsquo;t a
                traditional cookie, but it does the same job. Without it, you&rsquo;d have
                to sign in again every time.
              </li>
              <li>
                <span className="font-semibold text-ink">Planner progress.</span>{" "}As you
                move through picking a school, dorm, style, and budget, your
                in-progress choices are held in session storage under
                <code> dormscape-planner</code>. A usable room also has a recovery copy
                in local storage under <code>dormscape-planner-recovery-v2</code>.
                That local copy can survive closing the tab or signing out and can
                be seen by someone using the same browser. It is not a cloud backup.
              </li>
              <li><span className="font-semibold text-ink">Workspace recovery.</span>{" "}
                Unsaved workspace edits can be kept in session storage under
                <code> dormscape-workspace:…</code>, scoped to your account and room.
                The recovery entry is removed after the matching edits are saved or
                you discard it. Session storage normally ends with the tab, although
                browser session restoration can restore it. Saved rooms and comments
                are held on our server, not in this recovery entry.
              </li>
              <li><span className="font-semibold text-ink">3D drawing drafts.</span>{" "}
                <code>dormscape-3d-draft-v1:…</code> stores the room builder draft in
                local storage, scoped to your account. It remains until replaced or
                removed through site-data clearing or the account-deletion cleanup
                in that browser.
              </li>
            </ul>
          </section>

          <section id="preferences" className="mt-14 scroll-mt-24">
            <h2 className="font-display text-2xl font-bold tracking-tight">Preferences and temporary steps</h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Local storage remembers your cookie choice
              (<code>dormscape-cookie-consent</code>), motion preference
              (<code>dormscape-motion-paused</code>) and whether you have seen a
              welcome message. These entries have no automatic expiry in our code.
              Other short-lived entries support sign-in redirects, pending shopping
              actions and dismissed prompts. Session entries are cleared when their
              flow finishes or the browser tab session ends; local entries remain
              until removed by the relevant flow or cleared in your browser.
            </p>
          </section>

          <section id="collaboration-voice" className="mt-14 scroll-mt-24">
            <h2 className="font-display text-2xl font-bold tracking-tight">Live collaboration and voice</h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Supabase uses your existing sign-in session to authorize private
              workspace connections. Current online or away status, active view,
              selected piece, cursor coordinates and a temporary connection identifier
              are held in memory and shared with current room members. Dormscape
              does not store a cursor history. Comments and replies are server-side
              room data, not cookies; clearing browser storage does not delete them.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              When you choose to join Room voice, the app requests a short-lived
              LiveKit join token and keeps the connection state in memory. Dormscape
              does not save this token or call audio in cookies or local storage.
              LiveKit processes the audio and connection information needed to deliver
              the call. Dormscape does not record or transcribe calls. Leaving the
              call or workspace page disconnects the voice session.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Microphone permission is managed by your browser separately from cookies.
              Join with mic off does not enable it. Join and talk or Unmute asks for
              permission when needed; accepting analytics does not grant microphone
              access. Rejecting analytics does not disable room voice or comments.
              Read the <Link href="/privacy#room-voice" className={TEXT_LINK}>Privacy Policy</Link>
              {" "}for what is shared and retained.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Analytics
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Dormscape uses PostHog to see how the site is used: which pages get
              visited and which buttons get clicked. When configured, PostHog can
              use cookies and local storage with browser identifiers to connect
              usage events across visits. These identifiers are not necessarily
              anonymous. We use the results to improve the product, not for
              advertising profiles. Session recording is disabled. Events on private
              workspace, login, account and report pages are filtered out; private
              comments and voice audio are not sent to PostHog.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Our current analytics setup is opt-out: it may initialize before you
              answer the banner. Choose Reject and reload the page to apply that
              preference to an already-running analytics session. The preference
              prevents subsequent PostHog initialization and Dormscape analytics
              calls; it does not erase data already sent or existing stored entries.
              You can remove stored entries through your browser settings.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Separately, <code>dormscape-session</code> is a random identifier in
              local storage used to associate our product-click records and optional
              purchase-survey or feedback submissions. It remains until cleared and
              currently operates independently of the PostHog banner choice. It is
              not a login credential and does not contain call audio or private comments.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              What we don&rsquo;t use
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Dormscape does not use advertising or retargeting cookies or sell cookie
              data. If you follow an Amazon product link, use Google sign-in or visit
              Stripe checkout, that provider may use its own cookies and storage under
              its policies. Dormscape&rsquo;s banner does not control those other websites.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Managing cookies
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              You can clear or block cookies and local storage through your browser&rsquo;s
              settings at any time. Clearing site data can sign you out, remove unsaved
              plans and drawing drafts, and reset your preferences. Save any work you
              want to keep before clearing it. Reload afterward to see the cookie
              banner again and choose Accept or Reject. Blocking storage can prevent
              sign-in persistence and draft recovery.
            </p>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Clearing cookies is not the same as leaving a call or deleting your
              account. Use Leave in Room voice to end the current voice connection,
              and your browser&rsquo;s site permissions to revoke microphone access.
              To remove server-side account data, use
              {" "}<Link href="/account/settings#delete-account" className={TEXT_LINK}>Account settings</Link>
              {" "}or contact us. Retention and deletion details are in our Privacy Policy.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Changes to this policy
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              We may update this policy as Dormscape changes. We&rsquo;ll update the date
              at the top when we do.
            </p>
          </section>

          <section className="mt-14">
            <h2 className="font-display text-2xl font-bold tracking-tight">
              Questions
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-soft">
              Questions about cookies? Email{" "}
              <a href="mailto:info@dormscape.us" className={TEXT_LINK}>
                info@dormscape.us
              </a>
              .
            </p>
          </section>

          <div className="mt-14 flex flex-wrap gap-x-6 gap-y-2 border-t border-ink/10 pt-8 text-sm">
            <Link href="/terms" className={TEXT_LINK}>
              Terms of Service
            </Link>
            <Link href="/privacy" className={TEXT_LINK}>
              Privacy Policy
            </Link>
            <Link href="/" className={TEXT_LINK}>
              Back to Dormscape
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
