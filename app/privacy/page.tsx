import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import Link from "next/link";
import LegalLayout from "@/components/legal/LegalLayout";
import LegalSection from "@/components/legal/LegalSection";

// Structural draft reflecting dormscape's actual data flows (Supabase,
// PostHog, Google Analytics, Amazon Associates, Google OAuth) as of this writing. Have a legal
// professional (or a service like Termly/iubenda) review this before
// treating it as final, binding legal text, especially before scaling to
// meaningful user volume.
//
// Section headings (and the contents list) live in components/legal/docs.ts.

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description:
    "dormscape's privacy policy: account data, room designs, private comments, live collaboration, optional voice chat, and your data choices.",
  path: "/privacy",
});

// Plain-language recap. Accurate restatement of the sections below; sits
// alongside the full text and does not replace it.
const SUMMARY = [
  "We store account details, saved designs, shared-room content and comments, optional feedback, and usage records to operate and improve dormscape.",
  "We don't sell your data, and we don't build advertising profiles.",
  "Shared-room members can see your display name, comments and replies, online or away status, active room view, and live cursor. Public design links are a separate feature.",
  "Voice is optional. Your microphone stays off until you choose to talk. dormscape does not record or transcribe calls.",
  "Supabase handles room data and live collaboration; LiveKit carries voice. Resend, Stripe, Google, PostHog, Amazon, Anthropic and OpenFreeMap support the other features described below.",
  "Hall Finder reads a calendar file in your browser. A schedule screenshot or PDF is sent to Anthropic to be read and is never stored by dormscape; only the classes you confirm are kept.",
  "Delete your account in Account settings, or contact info@dormscape.us for help. Owned rooms and designs are removed; some support and payment records may remain.",
];

export default function PrivacyPage() {
  return (
    <LegalLayout
      doc="privacy"
      title="Privacy Policy"
      updated="October 31, 2026"
      intro={
        <p>
          This page explains what information dormscape collects, why, and what you
          can do about it. The short version: we collect what we need to run the
          planner and understand what&rsquo;s working, we don&rsquo;t sell your data, and
          you can ask us to delete your account at any time.
        </p>
      }
      summary={{
        note: "A plain-language recap, not a substitute for the full policy below.",
        items: SUMMARY,
      }}
    >
      {/* Full policy. */}

      <LegalSection doc="privacy" id="information-we-collect">
        <ul>
          <li>
            <strong>Account information.</strong>{" "}If
            you create an account, we store your email address and the username you
            choose. You can sign in with an email and password, or with Google. If
            you use Google, we receive your email address from Google; we don&rsquo;t
            see your Google password.
          </li>
          <li>
            <strong>Marketing emails.</strong>{" "}By ticking &ldquo;Email me dorm
            planning tips and dormscape updates&rdquo; when you sign up, you agree
            to receive marketing emails from dormscape, and we store when you opted
            in. Accounts created before we added this checkbox on October 31, 2026
            receive these emails unless they turn them off. You can turn them off
            at any time with the Marketing emails toggle in{" "}
            <Link href="/account/settings#marketing-emails">Account settings</Link>.
            Turning them off doesn&rsquo;t stop account, invitation or purchase
            emails.
          </li>
          <li>
            <strong>Saved room designs.</strong>{" "}When
            you save a room, we store the school, dorm, and room type you picked,
            your chosen style and budget, your furniture layout, and any product
            swaps you made, along with any roommate names, assignments, and
            layout alternatives you enter. This lets you reload a saved design.
            Anyone with its shared link can see these details.
          </li>
          <li>
            <strong>Device drafts.</strong>{" "}
            The planner keeps a recovery draft in this browser when storage is
            available. It may remain after you close the tab or sign out and is
            available to people using the same browser. Clear the site&rsquo;s
            browser storage to remove it. It is not a cross-device backup.
          </li>
          <li>
            <strong>Room review comments.</strong>{" "}
            Posting requires sign-in. We store the comment, display name,
            selected layout alternative, date, and your account identifier.
            The name and comment are visible to anyone with the room link;
            the account identifier is not included in public comment responses.
          </li>
          <li>
            <strong>
              Purchase surveys and feedback.
            </strong>{" "}
            After you shop a design, we may ask whether you actually made a
            purchase and, if you&rsquo;re willing, a star rating and short written
            feedback. Beyond the initial yes, no, or still deciding response, these
            are optional and not required to use the planner. If you choose to show
            your feedback as a review, we may publish your star rating, your words,
            the name you give and the school you enter on dormscape, after we read
            it, and nothing else about you. Contact us to take a published review down.
          </li>
          <li>
            <strong>Problem reports.</strong>{" "}
            We store the category, description, optional reply email and page path
            you submit, along with your account identifier if you are signed in.
            We strip query strings and invitation fragments from page paths.
            Reports are private to the team and may be sent to our support inbox
            using Resend. Do not include passwords or payment details.
          </li>
          <li>
            <strong>Hall Finder.</strong>{" "}
            To rank halls by walking time, you add the buildings you have classes
            in, the days you go, optional filters and, if you choose, a pin you
            drop on the map. These are kept in this browser and in the page
            address, with the name of the last schedule file you added, so a Hall
            Finder link you copy or share includes them. Each ranking request
            sends them to our server to work out walking times; we don&rsquo;t
            store them there. A calendar (.ics) file you upload is read in your
            browser and never sent to us. A screenshot or PDF of your schedule,
            which needs an account, is sent to Anthropic, our AI provider, to read
            the class names, days, times and locations. We handle the file in
            memory and don&rsquo;t store it or the text read from it; our logs
            record only counts and errors, such as the file&rsquo;s size and how
            many classes were found. You check what was read, and only the classes
            you confirm are added to your places, with their course names. Plus
            and Pro members can save setups: we store the school, your places
            (buildings or dropped pins) with their days and course names, your
            filters and the setup&rsquo;s name. Sharing a setup creates a link
            that lets anyone with it see its buildings, days and course names; a
            dropped pin is listed without its location. You can delete a setup
            from My designs, and deleting your account removes all of them. In
            a shared room in My Room, members can also add places to compare
            halls together: we store each member&rsquo;s places (buildings or
            dropped pins) with their days and course names, with the room. Other
            members see your buildings, days and weekly walk to each hall; course
            names and where you dropped a pin are shown only to you. Your places
            in a room are deleted when you leave it or are removed, when the room
            is deleted, or when you delete your account.
          </li>
          <li>
            <strong>Analytics.</strong>{" "}We use
            PostHog and Google Analytics to understand how people use dormscape:
            which pages get visited, how people find the site, which buttons get
            clicked, and where people drop off in the planning flow. Analytics
            can include browser identifiers and device or network information;
            it is not necessarily anonymous. We do not send private workspace
            comments or call audio to either service. PostHog session recording
            is disabled, and analytics events on workspace, login, account and
            report pages are filtered out. Google signals and ad personalization
            are turned off in Google Analytics. Separate product-click and optional
            feedback records can use a random browser identifier. See our
            Cookie Policy for storage details and choices.
          </li>
        </ul>
      </LegalSection>

      <LegalSection doc="privacy" id="how-we-use-it">
        <p>
          We use this information to run the planner (saving and reloading your
          designs), deliver invitations, synchronize shared rooms, display presence
          and comments, connect optional voice calls, rank halls by walking time
          in Hall Finder, process purchases, understand
          which parts of the product work and which
          don&rsquo;t, and to respond if you send us feedback. We don&rsquo;t use your
          data to build advertising profiles, and we don&rsquo;t sell it.
        </p>
      </LegalSection>

      <LegalSection doc="privacy" id="where-your-data-lives">
        <p>
          dormscape&rsquo;s data is stored with Supabase, a hosted database and
          authentication provider. Workspace reads and writes go through our
          authenticated server API. The browser also connects directly to Supabase
          for sign-in, permitted account operations and authorized private realtime
          channels. Access controls restrict room data to authorized members.
          LiveKit receives voice traffic when you join a call. Service providers
          may process connection, security and diagnostic records to operate their
          services; their infrastructure and backups have separate retention schedules.
        </p>
      </LegalSection>

      <LegalSection doc="privacy" id="private-workspaces">
        <p>Personal workspaces are visible to their owner. Shared workspaces require sign-in and membership. We store room layouts, product selections, shopping assignments, membership roles, comments and replies, and the latest 20 saved versions. A room allows four people total, including the owner.</p>
        <p>Workspace comments include your account identifier, display name, text, date, the room, furniture, product or layout being discussed, reply relationships and resolution status. Current room members can read them. Resolving a thread keeps it available in Resolved; it does not delete it. Leaving or being removed from a room does not erase your earlier comments. Deleting the workspace removes its comments and replies. Deleting your account removes your comments; replies attached to a deleted parent comment are also removed.</p>
        <p>When you open a shared room, Supabase Realtime shares your online or away status, active workspace tab, 2D or 3D view, selected piece and cursor position with its current members. Presence and cursors are transient and are not stored as room-history records. Closing or leaving the room disconnects this live presence; connection delays can briefly affect the displayed status.</p>
        <p>Owners enter a roommate&apos;s email to send an invitation through Resend. We store the recipient address, access level, expiry and a hash of the invitation token. The invitation requires the recipient&apos;s verified email and reserves a place for seven days. Pending invitation addresses are visible only to the owner; account email addresses are not shown in the member roster. Owners can change roles, remove members or make a room personal.</p>
        <p>Unsaved workspace recovery is kept in the current browser tab when storage is available, keyed to your account and room. Clearing browser storage does not delete saved server-side rooms or comments. Public saved-design links are separate: anyone with one of those links can view that saved snapshot and its public review comments.</p>
      </LegalSection>

      <LegalSection doc="privacy" id="room-voice">
        <p>Voice is optional and available only when configured for a Pro host&apos;s shared room. Joining sends LiveKit your room identifier, account identifier and display name, along with connection information needed to deliver the call, such as network addresses and device capabilities. When your microphone is on, LiveKit transports your live audio to the other participants in that voice room. Participants can see who has joined and microphone or speaking indicators.</p>
        <p>Join with mic off lets you listen without enabling your microphone. Join and talk or Unmute requests microphone access if your browser has not already granted it. You can mute, leave the call, or revoke microphone permission in your browser&apos;s site settings. dormscape does not request camera access for room voice. Calls disconnect when you leave the workspace page.</p>
        <p>dormscape does not record, transcribe or save call audio, and does not send it to an AI model. Call state and short-lived join credentials are held in memory for the connection. The voice provider may retain operational connection and diagnostic records under its service terms. We cannot prevent another participant from making a recording outside dormscape, so share only what you intend your roommates to hear.</p>
        <p>You can use comments and the room planner without joining voice. Cookie choices and microphone permissions are separate: accepting analytics does not enable your microphone, and rejecting analytics does not prevent you from using voice.</p>
      </LegalSection>

      <LegalSection doc="privacy" id="room-photos">
        <p>If you use See it in your room, your photo and a text description of your plan are sent to Google&rsquo;s Gemini image model through Vercel AI Gateway to make the picture. Photos are shrunk in your browser first, which removes location data. Both images are stored privately and deleted automatically after 14 days, or when you delete your account.</p>
      </LegalSection>

      <LegalSection doc="privacy" id="who-else-sees-it">
        <p>
          A few outside services are part of how dormscape works:
        </p>
        <ul>
          <li>
            <strong>Supabase</strong>{" "}hosts our
            database, handles account sign-in and delivers private live presence,
            cursors and room-change notifications.
          </li>
          <li>
            <strong>Google</strong>{" "}handles
            authentication if you choose to sign in with Google. We only receive
            the email address associated with your Google account.
          </li>
          <li>
            <strong>PostHog</strong>{" "}processes the
            usage events and browser identifiers described above, subject to the
            analytics choice explained in our Cookie Policy.
          </li>
          <li>
            <strong>Google Analytics</strong>{" "}measures
            site traffic, processing page visits, traffic sources and browser
            identifiers, subject to the same analytics choice. Its advertising
            features are turned off. Read{" "}
            <a href="https://policies.google.com/technologies/partner-sites">
              how Google uses information from sites that use its services
            </a>
            .
          </li>
          <li><strong>Anthropic</strong> reads the schedule screenshots and PDFs you choose to upload to Hall Finder and returns the classes it finds. dormscape doesn&rsquo;t store the file.</li>
          <li><strong>OpenFreeMap</strong> serves the map on Hall Finder pages. Your browser requests the map directly, so OpenFreeMap receives your network address and the area of the map you view. The map data is from OpenStreetMap.</li>
          <li><strong>LiveKit</strong> provides optional room voice, processing participant identifiers, live audio and connection data to deliver the call.</li>
          <li><strong>Resend</strong> delivers invitations, support messages and purchase confirmation emails, including recipient addresses and message content.</li>
          <li><strong>Stripe</strong> processes payments and invoices. dormscape receives purchase and invoice details, not your full card number.</li>
          <li>
            <strong>Amazon Associates</strong>{" "}is our
            affiliate partner. When you click a product link, Amazon&rsquo;s own
            tracking, not dormscape&rsquo;s, attributes the resulting purchase to us
            for the commission. What Amazon does with that click is governed by
            Amazon&rsquo;s own privacy policy.
          </li>
        </ul>
        <p>
          We share information with service providers to deliver the relevant
          features. External sign-in, payment and retailer services also have
          their own privacy policies. dormscape does not sell your personal data.
        </p>
      </LegalSection>

      <LegalSection doc="privacy" id="your-rights">
        <p>For a request to access, correct or delete your personal information, including a private comment, contact info@dormscape.us. Use <Link href="/report">Report a problem</Link> for inappropriate comments or problems with a room call. Reporting does not create an audio recording.</p>
        <p>
          You can permanently delete your account from{" "}
          <Link href="/account/settings#delete-account">Account settings</Link>.
          This removes your profile, saved designs, comments, memberships and rooms
          you own, including shared rooms for all their members. Paid access and
          unused credits are lost. Deletion does not issue a refund or cancel
          retailer orders. For help, email{" "}
          <a href="mailto:info@dormscape.us">
            info@dormscape.us
          </a>{" "}
          . Rooms and saved versions owned by other people, exported copies,
          support correspondence and payment records may remain. Reports may be
          retained for investigation; their linked account identifier and matching
          reply email are cleared. Paid invoice emails are sent through Resend with the purchase amount, tier, and Stripe invoice. We retain an email delivery record and invoice details as payment records. Provider backups follow their retention schedules.
          Recovery drafts in the browser used for deletion are cleared. Clear site
          storage on other devices to remove their local drafts. If you never created
          an account, clear browser storage to remove in-progress planner selections.
        </p>
      </LegalSection>

      <LegalSection doc="privacy" id="dont-sell">
        <p>
          dormscape does not sell your personal information to third parties, full
          stop.
        </p>
      </LegalSection>

      <LegalSection doc="privacy" id="changes">
        <p>
          We may update this policy as dormscape changes. We&rsquo;ll update the date
          at the top when we do.
        </p>
      </LegalSection>

      <LegalSection doc="privacy" id="questions">
        <p>
          Questions about your data? Email{" "}
          <a href="mailto:info@dormscape.us">
            info@dormscape.us
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
