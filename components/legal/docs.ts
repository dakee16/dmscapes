/**
 * The three legal documents that share the tabbed Legal template
 * (design-handoff/designs/site/Legal.dc.html). Section ids and headings live
 * here so the tabs can show each document's section count and the contents
 * list always matches the headings. The section bodies stay in each route's
 * page.tsx, word for word.
 */
export const LEGAL_DOCS = {
  terms: {
    label: "Terms",
    href: "/terms",
    sections: [
      { id: "what-dormscape-is", title: "What Dormscape is" },
      { id: "no-warranty", title: "No warranty on prices, availability, or fit" },
      { id: "affiliate", title: "The Amazon affiliate relationship" },
      { id: "defective-products", title: "Defective or faulty products" },
      { id: "paid-plans", title: "Paid plans and refunds" },
      { id: "college-data", title: "College and university data" },
      { id: "using-dormscape", title: "Using Dormscape" },
      { id: "accounts", title: "Accounts" },
      { id: "saving-your-design", title: "Saving your design" },
      { id: "shared-workspaces", title: "Shared room workspaces" },
      { id: "changes", title: "Changes to these terms" },
      { id: "questions", title: "Questions" },
    ],
  },
  privacy: {
    label: "Privacy",
    href: "/privacy",
    sections: [
      { id: "information-we-collect", title: "Information we collect" },
      { id: "how-we-use-it", title: "How we use it" },
      { id: "where-your-data-lives", title: "Where your data lives" },
      { id: "private-workspaces", title: "Shared rooms and comments" },
      { id: "room-voice", title: "Optional room voice" },
      { id: "who-else-sees-it", title: "Who else sees it" },
      { id: "your-rights", title: "Your rights" },
      { id: "dont-sell", title: "We don't sell your data" },
      { id: "changes", title: "Changes to this policy" },
      { id: "questions", title: "Questions" },
    ],
  },
  cookies: {
    label: "Cookies",
    href: "/cookies",
    sections: [
      { id: "sign-in-and-progress", title: "Sign-in and room progress" },
      { id: "preferences", title: "Preferences and temporary steps" },
      { id: "collaboration-voice", title: "Live collaboration and voice" },
      { id: "analytics", title: "Analytics" },
      { id: "what-we-dont-use", title: "What we don’t use" },
      { id: "managing-cookies", title: "Managing cookies" },
      { id: "changes", title: "Changes to this policy" },
      { id: "questions", title: "Questions" },
    ],
  },
} as const;

export type LegalKey = keyof typeof LEGAL_DOCS;
export type LegalSectionId<K extends LegalKey> = (typeof LEGAL_DOCS)[K]["sections"][number]["id"];

export const LEGAL_ORDER: LegalKey[] = ["terms", "privacy", "cookies"];

/** "01", "02", … the design's section numbers. */
export const sectionNumber = (i: number) => String(i + 1).padStart(2, "0");
