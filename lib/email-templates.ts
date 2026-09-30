// Server-side transactional templates. User and provider values are escaped.
export const escapeEmail = (value: string) => value.replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[character]!));

export function emailFrame({ eyebrow, title, intro, body = "", action, url, footnote }: {
  eyebrow: string; title: string; intro: string; body?: string; action: string; url: string; footnote: string;
}) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeEmail(eyebrow)} | dormscape</title></head>
<body style="margin:0;padding:0;background:#eeeee7;color:#17172b;font-family:Arial,Helvetica,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${escapeEmail(intro)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eeeee7"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#fffdf7;border:1px solid #d9dad4">
<tr><td style="background:#304bff;padding:26px 30px;color:white"><table role="presentation" width="100%"><tr><td style="color:white;font-size:27px;font-weight:700;letter-spacing:-1px">dormscape<span style="color:#ffe268">.</span></td><td align="right" style="color:#ffe268;font:11px 'Courier New',monospace">MAKE ROOM.</td></tr></table></td></tr>
<tr><td style="padding:34px 30px 8px"><p style="margin:0 0 18px;color:#304bff;font:11px/1.6 'Courier New',monospace;letter-spacing:1px;text-transform:uppercase">${escapeEmail(eyebrow)}</p><h1 style="margin:0 0 20px;font-size:34px;line-height:1.15;letter-spacing:-1px;font-weight:700">${escapeEmail(title)}</h1><p style="font-size:16px;line-height:1.8;color:#5a5f74;margin:0 0 20px">${escapeEmail(intro)}</p>${body}</td></tr>
<tr><td style="padding:12px 30px 28px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#304bff" style="background:#304bff;border:1px solid #304bff;mso-padding-alt:16px 26px"><a href="${escapeEmail(url)}" style="display:inline-block;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;padding:16px 26px">${escapeEmail(action)} &nbsp; ↗</a></td></tr></table></td></tr>
<tr><td style="padding:22px 30px;background:#f4f2e6;border-top:1px solid #e3e0d4"><p style="margin:0;font:italic 24px/1.3 Georgia,'Times New Roman',serif;color:#17172b">Your dorm, planned to the inch.</p></td></tr>
<tr><td style="padding:25px 30px 30px"><p style="margin:0 0 16px;color:#666b7d;font-size:12px;line-height:1.8">${escapeEmail(footnote)}</p><p style="margin:0 0 5px;color:#666b7d;font-size:11px;line-height:1.6">Button not working? Copy this link into your browser:</p><p style="margin:0 0 20px;font-size:11px;line-height:1.6;word-break:break-all;overflow-wrap:anywhere"><a href="${escapeEmail(url)}" style="color:#304bff">${escapeEmail(url)}</a></p><p style="margin:0;color:#7a7c8a;font-size:11px;line-height:1.6">dormscape.us &nbsp; / &nbsp; <a href="https://dormscape.us/contact" style="color:#62677a">Need a hand?</a></p></td></tr>
</table></td></tr></table></body></html>`;
}

export function workspaceInvitationEmail({ owner, room, email, role, url }: { owner: string; room: string; email: string; role: "editor" | "commenter"; url: string }) {
  const access = role === "editor" ? "Edit the layout, update the shopping list, and leave comments." : "View the layout and shopping list, and leave comments.";
  return {
    subject: `${owner} invited you to their room on Dormscape`,
    text: `${owner} invited you to "${room}" on Dormscape.\n\n${access}\nJoining is free. Sign in with ${email}. This invitation expires in seven days.\n\nJoin the room: ${url}\n\nIf you weren't expecting this invitation, you can ignore it.`,
    html: emailFrame({ eyebrow: "Your people / Your room", title: "You're invited. Make yourself at home.", intro: `${owner} invited you to "${room}" on Dormscape.`,
      body: `<table role="presentation" width="100%" style="background:#eef1ff;border-left:3px solid #304bff"><tr><td style="padding:18px;font-size:14px;line-height:1.8;color:#343956"><strong>${role === "editor" ? "Editing access" : "Comment access"}</strong><br>${escapeEmail(access)}<br><span style="color:#62677a">Join free with ${escapeEmail(email)}.</span></td></tr></table>`,
      action: "Join the room", url, footnote: "This invitation expires in seven days and only works with the email address it was sent to. If you weren't expecting it, you can ignore this email." }),
  };
}

export function purchaseInvoiceEmail({ tier, credits, invoiceNumber, amount, date, url }: { tier: string; credits: number; invoiceNumber: string; amount: string; date: string; url: string }) {
  const intro = `Thank you for purchasing ${tier}. Your purchase includes ${credits} plan credit${credits === 1 ? "" : "s"}.`;
  const rows = [["Purchase", tier], ["Invoice", invoiceNumber], ["Date", date], ["Paid", amount]].map(([label, value]) => `<tr><td style="padding:12px 0;border-bottom:1px solid #dfe2ec;font-size:13px;color:#636b82">${escapeEmail(label)}</td><td align="right" style="padding:12px 0 12px 16px;border-bottom:1px solid #dfe2ec;font-size:14px;color:#17172b">${escapeEmail(value)}</td></tr>`).join("");
  return {
    subject: `Thank you for purchasing ${tier} | Your invoice`,
    text: `${intro}\n\nInvoice: ${invoiceNumber}\nDate: ${date}\nPaid: ${amount}\nOne-time payment. No subscription.\n\nYour invoice PDF is attached. View the invoice: ${url}\n\nOpen your account: https://dormscape.us/account/billing\nNeed help? https://dormscape.us/contact`,
    html: emailFrame({ eyebrow: "A little more room for your ideas", title: "Good things ahead.", intro,
      body: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table><p style="font-size:12px;line-height:1.7;color:#62677a">One-time payment. No subscription.<br>Your paid invoice PDF is attached to this email.</p>`,
      action: "View your invoice", url, footnote: "This is the payment confirmation for your Dormscape purchase. Keep the attached invoice for your records. Your plan and credits are shown in Account > Billing." }),
  };
}
