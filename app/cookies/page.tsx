import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import LegalLayout from "@/components/legal/LegalLayout";
import LegalSection from "@/components/legal/LegalSection";

// Structural draft reflecting Dormscape's actual use of cookies and browser
// storage (sign-in, planner recovery, collaboration and analytics) as of this
// writing. Have a legal professional (or a service like Termly/iubenda)
// review this before treating it as final, binding legal text, especially
// before scaling to meaningful user volume.
//
// Section headings (and the contents list) live in components/legal/docs.ts.

export const metadata: Metadata = pageMetadata({
  title: "Cookie Policy",
  description:
    "Dormscape's cookie policy: sign-in, room drafts, workspace recovery, live collaboration, voice connections, analytics, and browser storage choices.",
  path: "/cookies",
});

export default function CookiesPage() {
  return (
    <LegalLayout
      doc="cookies"
      title="Cookie Policy"
      updated="September 30, 2026"
      intro={
        <p>
          Cookies are small pieces of data a site stores in your browser. Dormscape
          also uses local storage, session storage and temporary in-memory state.
          This page explains how these support planning, shared rooms and optional
          voice, and how to manage them. Dormscape does not use advertising or
          retargeting cookies.
        </p>
      }
    >
      <LegalSection doc="cookies" id="sign-in-and-progress">
        <p>
          These keep the basic site working.
        </p>
        <ul>
          <li>
            <strong>Sign-in session.</strong>{" "}If you
            create an account, your sign-in session is kept in your browser&rsquo;s
            local storage so you stay signed in between visits. This isn&rsquo;t a
            traditional cookie, but it does the same job. Without it, you&rsquo;d have
            to sign in again every time.
          </li>
          <li>
            <strong>Planner progress.</strong>{" "}As you
            move through picking a school, dorm, style, and budget, your
            in-progress choices are held in session storage under
            <code> dormscape-planner</code>. A usable room also has a recovery copy
            in local storage under <code>dormscape-planner-recovery-v2</code>.
            That local copy can survive closing the tab or signing out and can
            be seen by someone using the same browser. It is not a cloud backup.
          </li>
          <li><strong>Workspace recovery.</strong>{" "}
            Unsaved workspace edits can be kept in session storage under
            <code> dormscape-workspace:…</code>, scoped to your account and room.
            The recovery entry is removed after the matching edits are saved or
            you discard it. Session storage normally ends with the tab, although
            browser session restoration can restore it. Saved rooms and comments
            are held on our server, not in this recovery entry.
          </li>
          <li><strong>3D drawing drafts.</strong>{" "}
            <code>dormscape-3d-draft-v1:…</code> stores the room builder draft in
            local storage, scoped to your account. It remains until replaced or
            removed through site-data clearing or the account-deletion cleanup
            in that browser.
          </li>
        </ul>
      </LegalSection>

      <LegalSection doc="cookies" id="preferences">
        <p>
          Local storage remembers your cookie choice
          (<code>dormscape-cookie-consent</code>), motion preference
          (<code>dormscape-motion-paused</code>) and whether you have seen a
          welcome message. These entries have no automatic expiry in our code.
          Other short-lived entries support sign-in redirects, pending shopping
          actions and dismissed prompts. Session entries are cleared when their
          flow finishes or the browser tab session ends; local entries remain
          until removed by the relevant flow or cleared in your browser.
        </p>
      </LegalSection>

      <LegalSection doc="cookies" id="collaboration-voice">
        <p>
          Supabase uses your existing sign-in session to authorize private
          workspace connections. Current online or away status, active view,
          selected piece, cursor coordinates and a temporary connection identifier
          are held in memory and shared with current room members. Dormscape
          does not store a cursor history. Comments and replies are server-side
          room data, not cookies; clearing browser storage does not delete them.
        </p>
        <p>
          When you choose to join Room voice, the app requests a short-lived
          LiveKit join token and keeps the connection state in memory. Dormscape
          does not save this token or call audio in cookies or local storage.
          LiveKit processes the audio and connection information needed to deliver
          the call. Dormscape does not record or transcribe calls. Leaving the
          call or workspace page disconnects the voice session.
        </p>
        <p>
          Microphone permission is managed by your browser separately from cookies.
          Join with mic off does not enable it. Join and talk or Unmute asks for
          permission when needed; accepting analytics does not grant microphone
          access. Rejecting analytics does not disable room voice or comments.
          Read the <Link href="/privacy#room-voice">Privacy Policy</Link>
          {" "}for what is shared and retained.
        </p>
      </LegalSection>

      <LegalSection doc="cookies" id="analytics">
        <p>
          Dormscape uses PostHog to see how the site is used: which pages get
          visited and which buttons get clicked. When configured, PostHog can
          use cookies and local storage with browser identifiers to connect
          usage events across visits. These identifiers are not necessarily
          anonymous. We use the results to improve the product, not for
          advertising profiles. Session recording is disabled. Events on private
          workspace, login, account and report pages are filtered out; private
          comments and voice audio are not sent to PostHog.
        </p>
        <p>
          Our current analytics setup is opt-out: it may initialize before you
          answer the banner. Choose Reject and reload the page to apply that
          preference to an already-running analytics session. The preference
          prevents subsequent PostHog initialization and Dormscape analytics
          calls; it does not erase data already sent or existing stored entries.
          You can remove stored entries through your browser settings.
        </p>
        <p>
          Separately, <code>dormscape-session</code> is a random identifier in
          local storage used to associate our product-click records and optional
          purchase-survey or feedback submissions. It remains until cleared and
          currently operates independently of the PostHog banner choice. It is
          not a login credential and does not contain call audio or private comments.
        </p>
      </LegalSection>

      <LegalSection doc="cookies" id="what-we-dont-use">
        <p>
          Dormscape does not use advertising or retargeting cookies or sell cookie
          data. If you follow an Amazon product link, use Google sign-in or visit
          Stripe checkout, that provider may use its own cookies and storage under
          its policies. Dormscape&rsquo;s banner does not control those other websites.
        </p>
      </LegalSection>

      <LegalSection doc="cookies" id="managing-cookies">
        <p>
          You can clear or block cookies and local storage through your browser&rsquo;s
          settings at any time. Clearing site data can sign you out, remove unsaved
          plans and drawing drafts, and reset your preferences. Save any work you
          want to keep before clearing it. Reload afterward to see the cookie
          banner again and choose Accept or Reject. Blocking storage can prevent
          sign-in persistence and draft recovery.
        </p>
        <p>
          Clearing cookies is not the same as leaving a call or deleting your
          account. Use Leave in Room voice to end the current voice connection,
          and your browser&rsquo;s site permissions to revoke microphone access.
          To remove server-side account data, use
          {" "}<Link href="/account/settings#delete-account">Account settings</Link>
          {" "}or contact us. Retention and deletion details are in our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection doc="cookies" id="changes">
        <p>
          We may update this policy as Dormscape changes. We&rsquo;ll update the date
          at the top when we do.
        </p>
      </LegalSection>

      <LegalSection doc="cookies" id="questions">
        <p>
          Questions about cookies? Email{" "}
          <a href="mailto:info@dormscape.us">
            info@dormscape.us
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
