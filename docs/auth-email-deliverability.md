# Auth email deliverability + branded auth domain

Two related problems and everything needed to fix them:

1. **Auth emails (via Resend SMTP in Supabase) land in spam.**
2. **The raw `mvrogmmqglsrhoagfjvs.supabase.co` URL is visible to users** during
   email confirmation and Google sign-in.

Almost every fix here is a **dashboard or DNS change you have to make** (Resend,
Supabase, HostGator, Google Cloud). The app code is already parameterized, so
there is little to change in the repo. Each manual step is marked
**[YOU: where]**.

---

## TL;DR, in priority order

1. **[YOU: Supabase]** Confirm the SMTP **sender email** is `noreply@dormscape.us`
   (or similar on `dormscape.us`), not a Gmail, not `onboarding@resend.dev`, not
   the Supabase default. This is the single most likely spam cause. (Part 1, Fix 1)
2. **[YOU: Supabase]** Replace the bare default email templates with the branded
   ones in `docs/email-templates/`. (Part 1, Fix 2)
3. **[YOU: HostGator DNS]** Add a root SPF record for `dormscape.us`. (Part 1, Fix 3)
4. **[YOU: Supabase billing + HostGator DNS + Google Cloud]** Set up the
   `auth.dormscape.us` custom domain. This also removes the raw `supabase.co`
   link that is itself a spam trigger, so it helps both problems. (Part 2)
5. **[YOU: HostGator DNS]** Once alignment is verified, tighten DMARC from
   `p=none` to `p=quarantine`. (Part 1, Fix 4)

---

## Part 1: Why auth emails go to spam

### What the live DNS audit found (the good news)

I checked the live DNS for `dormscape.us`. Resend's authentication records are
**already correctly set up**:

| Record | Status | Value found |
| --- | --- | --- |
| DKIM (`resend._domainkey.dormscape.us`) | **OK** | Valid public key present |
| Return-path MX (`send.dormscape.us`) | **OK** | `feedback-smtp.us-east-1.amazonses.com` |
| Return-path SPF (`send.dormscape.us`) | **OK** | `v=spf1 include:amazonses.com ~all` |
| DMARC (`_dmarc.dormscape.us`) | Present, weak | `v=DMARC1; p=none;` (no enforcement, no reporting) |
| Root SPF (`dormscape.us`) | **Missing** | No SPF record at the root |

So DKIM signs as `d=dormscape.us` and the Resend return-path passes SPF. When the
From address is on `dormscape.us`, both DKIM and SPF **align**, and DMARC passes.
That means the domain authentication is not the smoking gun. The likely causes
are the ones I cannot see from outside: the From address and the email content.

### Fix 1 (highest impact): confirm the sender address **[YOU: Supabase]**

If Supabase is sending auth mail from an address that is **not** on the verified
`dormscape.us` domain, DKIM/SPF will not align with what the recipient sees in
the "From" field, and it gets flagged. This is the most common cause of the exact
symptom you describe.

1. Supabase dashboard -> **Project Settings -> Authentication -> SMTP Settings**
   (or **Authentication -> Emails -> SMTP** depending on dashboard version).
2. Confirm **Enable Custom SMTP** is on and pointed at Resend
   (`smtp.resend.com`, port `465` or `587`, username `resend`, password = your
   Resend API key).
3. Confirm the **Sender email** is `noreply@dormscape.us` (or `hello@`, `team@`,
   any address on `dormscape.us`). It must be on the domain verified in Resend.
   - If it currently reads `onboarding@resend.dev`, a Gmail address, or a
     `*.supabase.io` default, **that is the problem.** Change it.
4. Set the **Sender name** to `Dormscape`.
5. In the **Resend dashboard -> Domains**, confirm `dormscape.us` shows
   **Verified** (green), not "Pending." The DNS above says it should be verified,
   but confirm in the UI.

### Fix 2: replace the bare default templates **[YOU: Supabase]**

Supabase's default templates are a single naked link with almost no text.
Sparse, unbranded, single-link emails score badly with spam filters, and the
default link points at the raw `supabase.co` domain (a sender/link domain
mismatch, which is a classic phishing heuristic).

Branded, text-balanced, image-free replacements are in `docs/email-templates/`:

- `confirm-signup.html`
- `reset-password.html`
- `change-email.html`

Install steps and suggested subject lines are in
`docs/email-templates/README.md`. Paste each into **Authentication -> Emails ->
Templates**.

> These are the only three auth emails Dormscape sends (verified against the auth
> code: `signUp`, `resetPasswordForEmail`, and email-change `updateUser`). No
> magic-link or invite mail is sent, so leave those templates alone.

### Fix 3: add a root SPF record **[YOU: HostGator DNS]**

The root `dormscape.us` has an active mailbox (MX -> `mail.dormscape.us`, a
HostGator server) but **no SPF record**. Resend does not strictly need it (it
authenticates via the `send.` subdomain), but some filters lightly penalize a
From domain that publishes no SPF at all, and any mail you send from HostGator
webmail as `@dormscape.us` currently has no SPF cover.

Add one TXT record. In HostGator: **cPanel -> Zone Editor -> Manage** for
`dormscape.us -> + Add Record**:

| Field | Value |
| --- | --- |
| Type | `TXT` |
| Name / Host | `@` (the root `dormscape.us`) |
| TTL | `3600` |
| Value | `v=spf1 a mx include:websitewelcome.com ~all` |

Notes:
- `a mx` authorizes the domain's own A/MX host (HostGator mailbox).
- `include:websitewelcome.com` is HostGator's standard shared mail include. If
  your cPanel shows a different SPF include under email routing, use that one.
- Do **not** add `include:amazonses.com` here. Resend already covers its own path
  via `send.dormscape.us`; the root SPF is for HostGator-origin mail.
- Publish exactly **one** SPF (`v=spf1 ...`) TXT at the root. Two SPF records is
  a hard fail.

### Fix 4: harden DMARC, after you confirm alignment **[YOU: HostGator DNS]**

Today `_dmarc.dormscape.us` is `v=DMARC1; p=none;`, monitor-only with no
reports. Once Fixes 1 and 3 are in and you have confirmed passing mail (see
"How to verify"), tighten it and add a reporting address.

Edit the existing `_dmarc` TXT record in HostGator's Zone Editor to:

```
v=DMARC1; p=quarantine; rua=mailto:dmarc@dormscape.us; fo=1; adkim=r; aspf=r
```

- `p=quarantine` tells inboxes to treat unaligned mail as suspicious rather than
  trusting it. Move to `p=reject` later only after weeks of clean reports.
- `rua=mailto:dmarc@dormscape.us` sends you aggregate reports. Use an address you
  can actually receive at, or a DMARC reporting service.
- Do this **after** Fix 3, so legitimate HostGator mail is not caught by the
  stricter policy.

### How to verify it worked

- Send yourself a signup/reset from a real Gmail and Outlook account.
- In Gmail, open the message -> three-dot menu -> **Show original**. Confirm
  `SPF: PASS`, `DKIM: PASS`, `DMARC: PASS`, and that all three domains read
  `dormscape.us` (or `send.dormscape.us` for SPF).
- Paste one of the emails into [mail-tester.com](https://www.mail-tester.com) for
  a 0-to-10 spam score and a line-by-line breakdown.

---

## Part 2: Hide the raw supabase.co URL (custom auth domain)

Goal: auth links and OAuth redirects show `auth.dormscape.us` instead of
`mvrogmmqglsrhoagfjvs.supabase.co`. This also removes the sender/link domain
mismatch from Part 1, so it improves deliverability too.

### Billing requirement **[FLAG]**

Supabase **Custom Domains** is a **paid add-on** on a **paid project plan**
(historically the Pro plan, roughly $25/month, plus a Custom Domain add-on around
$10/month). Exact pricing changes over time, so confirm the current numbers in
your dashboard under **Project Settings -> Add-ons / Billing** before committing.
If the project is on the Free plan today, this step requires upgrading.

There is no code workaround for this. The raw `supabase.co` host is only
replaceable through Supabase's own custom-domain feature.

### The app is already ready **[no code change required]**

`NEXT_PUBLIC_SUPABASE_URL` is the single source of truth for the Supabase host.
It is read in exactly two places:

- `lib/supabase-browser.ts` (creates the browser client)
- `next.config.ts` (adds the host to the CSP `connect-src` automatically)

There are **no hardcoded `*.supabase.co` URLs** in the app. All `redirectTo` /
`emailRedirectTo` values already use `window.location.origin` (your own
`dormscape.us`), so they never expose Supabase. Switching the custom domain is
therefore just: change one env var, and the CSP follows it on redeploy. See
`.env.example` for the annotated variable.

### Step A: create the custom domain in Supabase **[YOU: Supabase]**

Easiest via the Supabase CLI (the dashboard also has this under **Project
Settings -> General -> Custom Domains** when the add-on is enabled):

```bash
supabase login
supabase domains create \
  --project-ref mvrogmmqglsrhoagfjvs \
  --custom-hostname auth.dormscape.us
```

This prints the exact DNS records to add: **one CNAME** for `auth.dormscape.us`
and **one or more TXT** challenge/verification records. Copy them verbatim. I
cannot pre-fill these values; they are generated per project and per request.

### Step B: add those DNS records at HostGator **[YOU: HostGator DNS]**

In **cPanel -> Zone Editor** for `dormscape.us`, add the records exactly as Step
A printed them. Typically:

| Type | Name / Host | Value |
| --- | --- | --- |
| CNAME | `auth` (i.e. `auth.dormscape.us`) | the target Supabase gave you |
| TXT | `_cf-custom-hostname.auth` or similar | the challenge string Supabase gave you |

- Use the exact host and target from Step A. Do not guess the CNAME target.
- If HostGator refuses to save a CNAME on a host that also has other records,
  make sure `auth.dormscape.us` has no conflicting A record.

### Step C: verify and activate **[YOU: Supabase]**

After DNS propagates (minutes to a couple hours):

```bash
supabase domains reverify --project-ref mvrogmmqglsrhoagfjvs
supabase domains activate  --project-ref mvrogmmqglsrhoagfjvs
```

Activation swaps the project over to `auth.dormscape.us` and provisions its TLS
certificate. (In the dashboard, this is the "Verify" then "Activate" buttons.)

### Step D: point the app at the new host **[YOU: Vercel + local]**

Set the env var to the custom domain in **both** places:

- **Vercel -> Project -> Settings -> Environment Variables**:
  `NEXT_PUBLIC_SUPABASE_URL = https://auth.dormscape.us` (Production, and Preview
  if you use it). Then **redeploy** so the client bundle and CSP pick it up.
- **Local `.env.local`**: change `NEXT_PUBLIC_SUPABASE_URL` to
  `https://auth.dormscape.us`.

Only change this **after** Step C activates the domain. Switching early breaks
auth, because the client would call a host that is not serving yet.

`SUPABASE_URL` (the server-side var) and `NEXT_PUBLIC_SUPABASE_ANON_KEY` can stay
as they are; the anon key is unchanged and the server var can keep using either
host.

### Step E: update Supabase Auth URL configuration **[YOU: Supabase]**

Dashboard -> **Authentication -> URL Configuration**:

- **Site URL**: `https://dormscape.us` (your app, not the auth host). Confirm it
  is the production domain, not a preview or localhost URL.
- **Redirect URLs** (allow-list): make sure it includes your real redirect
  targets, e.g. `https://dormscape.us/**`, `https://dormscape.us/reset-password`,
  `https://dormscape.us/account/settings`. These are app URLs and do not change
  with the custom domain, but confirm they are correct so confirmation links land
  back on the site.

### Step F: update Google OAuth **[YOU: Google Cloud Console]**

Because Google sign-in bounces through the Supabase auth host, its callback URL
changes to the custom domain.

Google Cloud Console -> **APIs & Services -> Credentials -> your OAuth 2.0 Client
ID** for Dormscape:

- **Authorized redirect URIs**: add
  `https://auth.dormscape.us/auth/v1/callback`.
  (You can keep `https://mvrogmmqglsrhoagfjvs.supabase.co/auth/v1/callback`
  during the transition, then remove it once the custom domain is confirmed
  working.)
- **Authorized JavaScript origins**: add `https://auth.dormscape.us` if you list
  origins there.
- Save. Google can take a few minutes to propagate.

Then in **Supabase -> Authentication -> Providers -> Google**, confirm the Client
ID / secret are unchanged (they are) and that Google sign-in still completes end
to end after the switch.

---

## Appendix: live values found during this audit

- Supabase project ref: `mvrogmmqglsrhoagfjvs`
- Raw host (currently user-visible): `https://mvrogmmqglsrhoagfjvs.supabase.co`
- Target auth host (to create): `https://auth.dormscape.us`
- `dormscape.us` MX: `mail.dormscape.us` (HostGator, `192.185.232.179`)
- `send.dormscape.us` MX: `feedback-smtp.us-east-1.amazonses.com` (Resend/SES)
- `send.dormscape.us` SPF: `v=spf1 include:amazonses.com ~all`
- `resend._domainkey.dormscape.us`: DKIM public key present
- `_dmarc.dormscape.us`: `v=DMARC1; p=none;`
- Root `dormscape.us` SPF: none

DNS values can change; re-check with `dig` before relying on them:

```bash
dig +short TXT dormscape.us                       # root SPF (currently empty)
dig +short TXT _dmarc.dormscape.us                # DMARC
dig +short TXT resend._domainkey.dormscape.us     # Resend DKIM
dig +short TXT send.dormscape.us                  # Resend return-path SPF
dig +short CNAME auth.dormscape.us                # custom auth host (after setup)
```
