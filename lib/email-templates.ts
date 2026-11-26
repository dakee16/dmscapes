// Server-side transactional templates. User and provider values are escaped.
export const escapeEmail = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));

export function emailFrame({ eyebrow, title, intro, preheader = intro, body = "", action, url, footnote, footer = "" }: {
  eyebrow: string; title: string; intro: string; preheader?: string; body?: string; action: string; url: string; footnote: string;
  /** Raw HTML after the contact line (marketing: why you got it, unsubscribe, postal address). */
  footer?: string;
}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeEmail(eyebrow)} | dormscape</title></head>
<body style="margin:0;padding:0;background:#eeeee7;color:#17172b;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeEmail(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eeeee7"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fffdf7;border:1px solid #d9dad4">
<tr><td style="background:#304bff;padding:26px 30px;color:white"><table role="presentation" width="100%"><tr><td style="color:white;font-size:27px;font-weight:700;letter-spacing:-1px">dormscape<span style="color:#ffe268">.</span></td><td align="right" style="color:#ffe268;font:11px 'Courier New',monospace">MAKE ROOM.</td></tr></table></td></tr>
<tr><td style="padding:34px 30px 8px"><p style="margin:0 0 18px;color:#304bff;font:11px/1.6 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase">${escapeEmail(eyebrow)}</p><h1 style="margin:0 0 20px;font-size:34px;line-height:1.15;letter-spacing:-1px;font-weight:700">${escapeEmail(title)}</h1><p style="font-size:16px;line-height:1.8;color:#5a5f74;margin:0 0 20px">${escapeEmail(intro)}</p>${body}</td></tr>
<tr><td style="padding:12px 30px 28px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#304bff" style="background:#304bff;border:1px solid #304bff;mso-padding-alt:16px 26px"><a href="${escapeEmail(url)}" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 26px">${escapeEmail(action)} &nbsp; →</a></td></tr></table></td></tr>
<tr><td style="padding:22px 30px;background:#f4f2e6;border-top:1px solid #e3e0d4"><p style="margin:0;font:italic 24px/1.3 Georgia,'Times New Roman',serif;color:#17172b">Your dorm, planned to the inch.</p></td></tr>
<tr><td style="padding:25px 30px 30px"><p style="margin:0 0 16px;color:#666b7d;font-size:12px;line-height:1.8">${escapeEmail(footnote)}</p><p style="margin:0 0 5px;color:#666b7d;font-size:11px;line-height:1.6">Button not working? Copy this link into your browser:</p><p style="margin:0 0 20px;font-size:11px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere"><a href="${escapeEmail(url)}" style="color:#304bff">${escapeEmail(url)}</a></p><p style="margin:0;color:#7a7c8a;font-size:11px;line-height:1.6">dormscape.us &nbsp; / &nbsp; <a href="https://dormscape.us/contact" style="color:#62677a">Need a hand?</a></p>${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

export function workspaceInvitationEmail({ owner, room, email, role, url }: { owner: string; room: string; email: string; role: "editor" | "commenter"; url: string }) {
  const access = role === "editor" ? "Edit the layout, update the shopping list, and leave comments." : "View the layout and shopping list, and leave comments.";
  return {
    subject: `${owner} invited you to their room on dormscape`,
    text: `${owner} invited you to "${room}" on dormscape.\n\n${access}\nJoining is free. Sign in with ${email}. This invitation expires in seven days.\n\nJoin the room: ${url}\n\nIf you weren't expecting this invitation, you can ignore it.`,
    html: emailFrame({ eyebrow: "Your people / Your room", title: "You're invited. Make yourself at home.", intro: `${owner} invited you to "${room}" on dormscape.`,
      body: `<table role="presentation" width="100%" style="background:#eef1ff;border-left:3px solid #304bff"><tr><td style="padding:18px;font-size:14px;line-height:1.8;color:#343956"><strong>${role === "editor" ? "Editing access" : "Comment access"}</strong><br>${escapeEmail(access)}<br><span style="color:#62677a">Join free with ${escapeEmail(email)}.</span></td></tr></table>`,
      action: "Join the room", url, footnote: "This invitation expires in seven days and only works with the email address it was sent to. If you weren't expecting it, you can ignore this email." }),
  };
}

export function purchaseInvoiceEmail({ tier, credits, invoiceNumber, amount, date, url, gift = false }: { tier: string; credits: number; invoiceNumber: string; amount: string; date: string; url: string; gift?: boolean }) {
  // A gift's buyer gets this same invoice email, worded so it doesn't promise them the credits.
  const intro = gift
    ? `Thank you for giving ${tier}. The gift includes ${credits} plan credit${credits === 1 ? "" : "s"}, and we email it straight to the person you chose.`
    : `Thank you for purchasing ${tier}. Your purchase includes ${credits} plan credit${credits === 1 ? "" : "s"}.`;
  const footnote = gift
    ? "This is the payment confirmation for your dormscape gift. Keep the attached invoice for your records. Account > Billing shows when the gift is redeemed."
    : "This is the payment confirmation for your dormscape purchase. Keep the attached invoice for your records. Your plan and credits are shown in Account > Billing.";
  const rows = [["Purchase", tier], ["Invoice", invoiceNumber], ["Date", date], ["Paid", amount]].map(([label, value]) => `<tr><td style="padding:12px 0;border-bottom:1px solid #dfe2ec;font-size:13px;color:#636b82">${escapeEmail(label)}</td><td align="right" style="padding:12px 0 12px 16px;border-bottom:1px solid #dfe2ec;font-size:14px;color:#17172b">${escapeEmail(value)}</td></tr>`).join("");
  return {
    subject: `Thank you for purchasing ${tier} | Your invoice`,
    text: `${intro}\n\nInvoice: ${invoiceNumber}\nDate: ${date}\nPaid: ${amount}\nOne-time payment. No subscription.\n\nYour invoice PDF is attached. View the invoice: ${url}\n\nOpen your account: https://dormscape.us/account/billing\nNeed help? https://dormscape.us/contact`,
    html: emailFrame({ eyebrow: "A little more room for your ideas", title: "Good things ahead.", intro,
      body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table><p style="font-size:12px;line-height:1.7;color:#62677a">One-time payment. No subscription.<br>Your paid invoice PDF is attached to this email.</p>`,
      action: "View your invoice", url, footnote }),
  };
}

// What each gifted plan unlocks. Prices never appear in the gift email; credits come from the caller (lib/plan.ts).
const GIFT_PERKS = {
  plus: "All 9 vibes, your own Amazon products, PDF and PNG export, and side-by-side comparison.",
  pro: "The 3D Room Builder, the Live 3D Room Studio, your own custom vibe, and a shared room for up to four people. Everything in Plus, too.",
} as const;

/** The gift email, to the recipient only. Transactional (one email per purchase), so no unsubscribe; the
 * frame carries the contact link. Every value the buyer typed is escaped. */
export function giftEmail({ plan, credits, from, message, code, url }: {
  plan: "plus" | "pro"; credits: number; from: string | null; message: string | null; code: string; url: string;
}) {
  const tier = plan === "pro" ? "dormscape Pro" : "dormscape Plus";
  const sender = from ?? "Someone";
  const credit = `${credits} plan credit${credits === 1 ? "" : "s"}`;
  const intro = `${sender} sent you ${tier}: ${credit} and every ${plan === "pro" ? "Pro" : "Plus"} tool, on your own account.`;
  const note = message
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;background:#eef1ff;border-left:3px solid #304bff"><tr><td style="padding:18px 20px;font-size:16px;line-height:1.7;color:#17172b">${escapeEmail(message).replace(/\n/g, "<br>")}<br><span style="color:#62677a;font-size:14px">${escapeEmail(from ? `From ${from}` : "From the sender")}</span></td></tr></table>`
    : "";
  const body = note
    + `<p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#17172b"><strong>${escapeEmail(credit)}.</strong> ${escapeEmail(GIFT_PERKS[plan])}</p>`
    + `<p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#62677a">One credit makes one room plan. Saving and editing never use one.</p>`
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px dashed #304bff"><tr><td style="padding:18px 20px">`
    + `<p style="margin:0 0 6px;color:#304bff;font:700 11px/1.6 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase">Your gift code</p>`
    + `<p style="margin:0 0 6px;font:700 24px/1.3 'Courier New',monospace;letter-spacing:2px;color:#17172b">${escapeEmail(code)}</p>`
    + `<p style="margin:0;font-size:13px;line-height:1.6;color:#62677a">No expiry. It works once, whenever you're ready.</p></td></tr></table>`;
  return {
    subject: `${sender} sent you a gift: ${tier}`,
    text: [
      intro,
      message ? `"${message}"\n${from ? `From ${from}` : "From the sender"}` : null,
      `${credit}. ${GIFT_PERKS[plan]}`,
      `Your gift code: ${code}\nNo expiry. It works once, whenever you're ready.`,
      `Redeem your gift: ${url}\nSign in or create a free dormscape account, and the plan is yours.`,
      "If you weren't expecting this, you can ignore it.\nNeed a hand? https://dormscape.us/contact",
    ].filter(Boolean).join("\n\n"),
    html: emailFrame({ eyebrow: "A gift for you / No expiry", title: `You've got ${plan === "pro" ? "Pro" : "Plus"}.`, intro, body, action: "Redeem your gift", url,
      footnote: "Redeem it on a free dormscape account; signing up takes a minute. The code works once and has no expiry. If you weren't expecting this gift, you can ignore this email." }),
  };
}

// Black Friday 2026 marketing emails (owner decisions, 2026-11-24). Sent only to
// profiles with marketing_opt_in_at set, by scripts/send-campaign.mjs, which
// imports this file directly, so keep it free of imports. The sale prices
// themselves are charged by the black-friday-sale branch; the regular prices and
// base credits here are checked against lib/plan.ts (scripts/check-unsubscribe.cjs).
export const BF2026 = {
  window: "Thu Nov 26, 12:00am ET to Mon Nov 30, 11:59pm ET",
  ends: "Mon Nov 30, 11:59pm ET",
  bonus: 2,
  plus: { price: "$1.99", regular: "$4.99", credits: 5 },
  pro: { price: "$4.99", regular: "$14.99", credits: 12 },
};
export const CAMPAIGNS = ["bf2026-launch", "bf2026-lastday"] as const;
export type Campaign = (typeof CAMPAIGNS)[number];
/** CAN-SPAM postal address. The send script fills it from MARKETING_MAILING_ADDRESS and refuses to send without it. */
export const MAILING_ADDRESS_PLACEHOLDER = "{{MAILING_ADDRESS}}";

const { plus, pro, bonus, ends } = BF2026;
const SETTINGS_URL = "https://dormscape.us/account/settings#marketing-emails";
const PLUS_PERKS = "All 9 vibes, your own Amazon products, PDF and PNG export, and side-by-side comparison.";
const PRO_PERKS = "The 3D Room Builder, the Live 3D Room Studio, your own custom vibe, and a shared room for up to four people, including you. Everything in Plus, too.";
const CAMPAIGN_COPY: Record<Campaign, {
  content: string; eyebrow: string; title: string; intro: string; action: string; after?: string;
  /** Subject and preheader, two options each; the send script picks with --option a|b. */
  options: Record<"a" | "b", [subject: string, preheader: string]>;
}> = {
  "bf2026-launch": {
    content: "launch",
    eyebrow: "Black Friday / Through Mon Nov 30",
    title: "Plan your room for less.",
    intro: `Plus is ${plus.price} and Pro is ${pro.price} through ${ends}. Each comes with ${bonus} bonus plan credits.`,
    action: "See the sale",
    options: {
      a: [`Black Friday: Plus ${plus.price}, Pro ${pro.price}`, `Each comes with ${bonus} bonus credits. Ends ${ends}.`],
      b: [`dormscape Pro is ${pro.price} through Monday`, `Plus is ${plus.price}. Both come with ${bonus} bonus credits and no subscription.`],
    },
  },
  "bf2026-lastday": {
    content: "lastday",
    eyebrow: "Black Friday / Last day",
    title: "Last day for these prices.",
    intro: `Plus is ${plus.price} and Pro is ${pro.price}, each with ${bonus} bonus plan credits, until tonight, ${ends}.`,
    action: "Get the sale price",
    after: `After that, Plus goes back to ${plus.regular} with ${plus.credits - bonus} credits, and Pro to ${pro.regular} with ${pro.credits - bonus}.`,
    options: {
      a: [`Last day: Plus ${plus.price}, Pro ${pro.price}`, `The Black Friday prices end tonight, ${ends}.`],
      b: ["The Black Friday prices end tonight", `Plus ${plus.price} and Pro ${pro.price}, each with ${bonus} bonus credits, until 11:59pm ET.`],
    },
  },
};

export function campaignEmail(campaign: Campaign, { unsubscribeUrl, mailingAddress, option = "a" }: {
  /** The /unsubscribe confirm page for this recipient (lib/unsubscribe.ts). */
  unsubscribeUrl: string; mailingAddress?: string; option?: "a" | "b";
}) {
  const copy = CAMPAIGN_COPY[campaign];
  const [subject, preheader] = copy.options[option];
  const url = `https://dormscape.us/pricing?utm_source=email&utm_medium=email&utm_campaign=bf2026&utm_content=${copy.content}`;
  const address = mailingAddress?.trim() || MAILING_ADDRESS_PLACEHOLDER;
  const terms = "One-time payment. No subscription. One credit per generated room plan; saving and editing never use one.";
  const footnote = `The sale runs ${BF2026.window}. Sale prices are for one-time Plus and Pro purchases; Flex credits and recharges keep their usual prices.`;
  const why = "You're getting this because you're subscribed to dormscape tips and updates.";
  const card = (name: string, p: typeof plus, perks: string, accent: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 12px;background:#ffffff;border:1px solid #d9dad4;border-left:4px solid ${accent}"><tr><td style="padding:18px 20px">`
    + `<p style="margin:0 0 4px;color:#304bff;font:700 11px/1.6 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase">${name}</p>`
    + `<p style="margin:0 0 8px;color:#17172b"><span style="font-size:34px;font-weight:700;letter-spacing:-1px">${p.price}</span>&nbsp; <span style="font-size:14px;color:#62677a">regularly ${p.regular}</span></p>`
    + `<p style="margin:0 0 6px;font-size:15px;line-height:1.6;color:#17172b"><strong>${p.credits} plan credits:</strong> the usual ${p.credits - bonus}, plus ${bonus} bonus.</p>`
    + `<p style="margin:0;font-size:14px;line-height:1.7;color:#5a5f74">${perks}</p></td></tr></table>`;
  const body = card("Plus", plus, PLUS_PERKS, "#ffe268") + card("Pro", pro, PRO_PERKS, "#304bff")
    + `<p style="margin:6px 0 0;font-size:13px;line-height:1.7;color:#62677a">${terms}</p>`
    + (copy.after ? `<p style="margin:14px 0 0;font-size:15px;line-height:1.7;color:#17172b">${escapeEmail(copy.after)}</p>` : "");
  const footer = `<p style="margin:18px 0 0;padding-top:16px;border-top:1px solid #e3e0d4;color:#7a7c8a;font-size:11px;line-height:1.7">${escapeEmail(why)} <a href="${escapeEmail(unsubscribeUrl)}" style="color:#304bff">Unsubscribe</a> in one click, no login needed, or turn these off in <a href="${SETTINGS_URL}" style="color:#62677a">Account settings</a>.</p>`
    + `<p style="margin:8px 0 0;color:#7a7c8a;font-size:11px;line-height:1.6">dormscape, ${escapeEmail(address)}</p>`;
  const plan = (name: string, p: typeof plus, perks: string) => `${name.toUpperCase()}: ${p.price} (regularly ${p.regular})\n${p.credits} plan credits: the usual ${p.credits - bonus}, plus ${bonus} bonus.\n${perks}`;
  return {
    subject,
    text: [copy.title, copy.intro, plan("Plus", plus, PLUS_PERKS), plan("Pro", pro, PRO_PERKS), terms, copy.after, `${copy.action}: ${url}`, footnote,
      `--\n${why}\nUnsubscribe in one click, no login needed: ${unsubscribeUrl}\nOr turn these off in Account settings: ${SETTINGS_URL}\ndormscape, ${address}`]
      .filter(Boolean).join("\n\n"),
    html: emailFrame({ eyebrow: copy.eyebrow, title: copy.title, intro: copy.intro, preheader, body, action: copy.action, url, footnote, footer }),
  };
}
