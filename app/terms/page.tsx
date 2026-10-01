import type { Metadata } from "next";
import Link from "next/link";
import LegalLayout from "@/components/legal/LegalLayout";
import LegalSection from "@/components/legal/LegalSection";
import { PLUS_INITIAL_CREDITS, PRO_INITIAL_CREDITS, RECHARGE_CREDITS, PLUS_PRICE_USD, PRO_PRICE_USD, RECHARGE_PRICE_USD, FLEX_CREDIT_PRICE_USD } from "@/lib/plan";

// Structural draft reflecting Dormscape's actual data flows and business
// model as of this writing. Have a legal professional (or a service like
// Termly/iubenda) review this before treating it as final, binding legal
// text, especially before scaling to meaningful user volume.
//
// PRESENTATION NOTE: the TOC, section numbers, and "short version" summary box
// are navigation/structure only. Credit terms reflect the current offer.
// Section headings (and the contents list) live in components/legal/docs.ts.

export const metadata: Metadata = {
  description:
    "Dormscape's terms of service: what the free dorm planner does, what it doesn't guarantee, and how the Amazon affiliate links work.",
};

// Plain-language recap. Accurate restatement of the sections below; it sits
// alongside the full text and does not replace it.
const SUMMARY = [
  "A free account includes one generated room plan. More generations use purchased plan credits.",
  "We can't guarantee prices, availability, or that a product fits. Measure and check before you buy.",
  "Some links are Amazon affiliate links; we may earn a small commission at no extra cost to you, which keeps the tool free.",
  "We don't sell or ship products. Returns, refunds, and faulty items are handled by Amazon, not us.",
  "Paid Dormscape features (Plus, Flex credits, Pro) are final and non-refundable; we don't entertain refunds or payment disputes on them.",
  "We're not affiliated with any college; dorm data comes from public sources, not an official record.",
  "An account is required to generate and save designs. You can delete yours in Account settings.",
  "Unsaved designs can be lost, so save before you leave the page.",
];

export default function TermsPage() {
  return (
    <LegalLayout
      doc="terms"
      title="Terms of Service"
      updated="September 28, 2026"
      intro={
        <p>
          Dormscape is a free tool. These terms explain what that means: what you can
          expect from us, what we can&rsquo;t promise, and the rules for using the site.
          By using Dormscape, you agree to them.
        </p>
      }
      summary={{
        note: "A plain-language recap, not a substitute for the full terms below.",
        items: SUMMARY,
      }}
    >
      {/* ---- Full legal text (verbatim) ---- */}

      <LegalSection doc="terms" id="what-dormscape-is">
        <p>
          Dormscape helps you plan a dorm room before you move in. Pick your school
          and building, get real room dimensions where they&rsquo;re published, choose a
          style, set a budget, and get a shoppable list of products that fit. The
          planner is free to try. You can browse rooms and styles without an account.
          An account is required to generate a plan and includes one free generation.
        </p>
      </LegalSection>

      <LegalSection doc="terms" id="no-warranty">
        <p>
          Product prices, availability, and shipping are set by the retailer
          (currently Amazon), not by Dormscape. Prices change, items go out of
          stock, and listings get updated on their end without notice to us. We do
          our best to keep product data current, but we can&rsquo;t guarantee that a
          price or listing you see on Dormscape matches what you&rsquo;ll see at
          checkout.
        </p>
        <p>
          Room dimensions, furniture placements, and product suggestions are
          planning aids, not guarantees. Measure your actual space and check a
          product&rsquo;s real dimensions before you buy, especially for anything large
          or hard to return.
        </p>
      </LegalSection>

      <LegalSection doc="terms" id="affiliate">
        <p>
          Dormscape is a participant in the Amazon Associates program. Some links on
          this site are affiliate links. If you click through and buy something,
          Dormscape earns a small commission, at no extra cost to you. This is how
          the tool stays free. It doesn&rsquo;t change the price you pay, and it
          doesn&rsquo;t influence which products we choose to feature beyond wanting
          them to actually fit the room and budget you set.
        </p>
      </LegalSection>

      <LegalSection doc="terms" id="defective-products">
        <p>
          Dormscape doesn&rsquo;t sell, ship, stock, or fulfill any of the products you
          see here. Every item is sold by the retailer (currently Amazon), and buying
          it happens entirely on their site, under their terms. We&rsquo;re not
          responsible for products that arrive defective, damaged, faulty, late, or
          not as described, and we can&rsquo;t process returns, refunds, replacements,
          or warranty claims.
        </p>
        <p>
          If something you bought through a link on Dormscape has a problem, resolve it
          directly with Amazon (or the relevant retailer) through their own return and
          refund process, which is what governs that purchase. Reaching out to us about
          a damaged or faulty item won&rsquo;t be able to fix it, because the order was
          never ours to fulfill.
        </p>
      </LegalSection>

      <LegalSection doc="terms" id="paid-plans">
        <p>
          Plus costs ${PLUS_PRICE_USD.toFixed(2)} once and includes {PLUS_INITIAL_CREDITS} plan credits.
          A Plus recharge costs ${RECHARGE_PRICE_USD.toFixed(2)} and adds {RECHARGE_CREDITS} credits.
          Pro costs ${PRO_PRICE_USD.toFixed(2)} once and includes {PRO_INITIAL_CREDITS} plan credits,
          Pro tools, and all Plus tools. All tiers can buy additional credits
          for ${FLEX_CREDIT_PRICE_USD.toFixed(2)} each. These are one-time purchases,
          not subscriptions; included credits do not reset monthly.
        </p>
        <p>
          A new generated room plan uses one plan credit. Custom vibes include
          one free regeneration of the same vibe; subsequent regenerations use
          one credit each. Editing furniture, drawing or building a room shell,
          saving, sharing, exporting, comparing, and switching views use no credits.
          At zero credits, new generations require a top-up; your purchased tools
          and saved designs remain available.
        </p>
        <p>
          Purchased credits do not expire. Existing purchased credit balances are
          retained, and new purchases add to the balance. The allowance shown at
          checkout applies to that purchase.
        </p>
        <p>
          Some Dormscape features are paid: the Plus one-time unlock,
          &agrave;-la-carte Flex credits, and the Pro plan. All payments for these
          are final and non-refundable. When you buy, you&rsquo;re paying for access
          to the feature, not for any particular result or outcome.
        </p>
        <p>
          If a paid feature doesn&rsquo;t work out the way you hoped (for
          example, a generated room, product match, or layout isn&rsquo;t what you
          wanted), that is not grounds for a refund. We don&rsquo;t issue
          refunds, partial refunds, or credit-backs, and we don&rsquo;t entertain
          payment disputes or chargebacks, for a paid feature that was delivered to
          your account. By purchasing, you agree not to initiate a chargeback or
          dispute on that basis. Payments are processed by Stripe under their terms.
        </p>
      </LegalSection>

      <LegalSection doc="terms" id="college-data">
        <p>
          Dormscape is not affiliated with, endorsed by, or operated on behalf of any
          college or university listed on this site. Room dimensions and hall
          information come from publicly available housing data and are provided to
          help you plan, not as an official record. Always confirm your actual
          room&rsquo;s dimensions and furnishings with your school&rsquo;s housing office
          before buying anything you can&rsquo;t return.
        </p>
      </LegalSection>

      <LegalSection doc="terms" id="using-dormscape">
        <p>
          Use the site the way it&rsquo;s meant to be used: to plan a room, save a
          design, and shop for it if you want to. Don&rsquo;t scrape, automate, or
          resell the data behind it. Don&rsquo;t submit deliberately false information,
          like fake room dimensions or impersonating a school. Don&rsquo;t try to abuse
          the account or feedback systems. We reserve the right to suspend or
          terminate access for accounts that misuse the service.
        </p>
      </LegalSection>

      <LegalSection doc="terms" id="accounts">
        <p>
          An account is required to generate and save a design, manage credits,
          and return to saved rooms later. You can delete your account in{" "}
          <Link href="/account/settings#delete-account">Account settings</Link>
          {" "}or contact us for help. Deletion is permanent and removes paid access,
          unused credits and rooms you own, including shared rooms for their members.
          It does not issue a refund or cancel retailer orders. See the{" "}
          <Link href="/privacy">
            Privacy Policy
          </Link>{" "}
          for details on what we store and how deletion works.
        </p>
      </LegalSection>

      <LegalSection doc="terms" id="saving-your-design">
        <p>
          Dormscape keeps a recovery draft on your device when browser storage
          is available. It can survive refreshing or closing the tab, but
          clearing browser data, replacing the draft, or using private browsing
          can remove it. This draft is not a cloud backup and does not transfer
          between devices. Use Save design to keep a named copy in your account.
          Saving is free and unlimited. Shared room links show a saved snapshot,
          including its roommate assignments and layout alternatives. Anyone
          with the link can read posted review comments; comments do not edit
          the original room.
        </p>
      </LegalSection>

      <LegalSection doc="terms" id="shared-workspaces">
        <p>Every account can keep personal workspaces. Pro includes hosting one active shared workspace with up to four people, including its owner. Invited members join free with editing or comment access. The host's Pro access applies inside that shared room; it does not upgrade a guest's personal account. Email invitations reserve a place for seven days and require the recipient to sign in with that verified email address. The owner can cancel invitations, remove members, or make a room personal. Making a room personal removes invited members. If the host no longer has Pro, invited members retain read access but cannot make shared changes.</p>
        <p>Workspace changes save to the account when the app reports that saving succeeded. Conflicting edits require review. We retain the latest 20 room versions; a restored version replaces the current layout and shopping state for all members. Keep exported copies of important work. Generation credits are separate from room storage: saving, manual editing, invitations, and view changes do not spend credits. Guests cannot spend a host's generation credits.</p>
        <p>Deleting a workspace removes its membership, invitations, comments, and versions. Original saved designs remain separate. Purchasing assignments help roommates coordinate; they do not create payments or settle debts.</p>
      </LegalSection>

      <LegalSection doc="terms" id="changes">
        <p>
          We may update these terms as Dormscape changes. If we do, we&rsquo;ll update
          the date at the top of this page. Continuing to use the site after a
          change means you accept the update.
        </p>
      </LegalSection>

      <LegalSection doc="terms" id="questions">
        <p>
          Questions about these terms? Email{" "}
          <a href="mailto:info@dormscape.us">
            info@dormscape.us
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
