# Dormscape auth email templates

Branded, spam-filter-friendly replacements for Supabase's bare default auth
emails. These are the three templates Dormscape actually sends today (confirmed
against the auth code):

| File | Supabase template | Suggested subject |
| --- | --- | --- |
| `confirm-signup.html` | Confirm signup | `Confirm your email for Dormscape` |
| `reset-password.html` | Reset Password | `Reset your Dormscape password` |
| `change-email.html` | Change Email Address | `Confirm your new email for Dormscape` |

We do **not** send magic-link or invite emails, so those templates can be left
as-is.

## How to install (manual, dashboard only)

Supabase auth email templates live in the dashboard, not in this repo. There is
no API in the app that sends them, so pasting is the only way to update them.

1. Open the Supabase dashboard for the project.
2. Go to **Authentication -> Emails -> Templates**.
3. Select a template (for example, **Confirm signup**).
4. Set the **Subject** to the value from the table above.
5. Open the matching `.html` file here, copy its full contents, and paste it
   into the **Message body (HTML)** field. (The HTML comment at the top is
   harmless; you can delete it or leave it.)
6. Save. Repeat for the other two templates.

## Why these are built the way they are

Deliverability, not decoration. Each choice below lowers spam scoring:

- **No external images.** Nothing to block, nothing to flag as image-heavy. The
  wordmark is styled text.
- **Table-based layout with inline styles.** Renders consistently in Gmail,
  Outlook, and Apple Mail.
- **One clear call to action** plus a visible fallback link for clients that
  strip buttons.
- **A plain-language reason line in the footer** ("You received this because...")
  so filters and recipients see a legitimate sender.
- **Design-system colors and fonts** (paper `#fafaf8`, ink `#17172b`, cobalt
  `#2b4eff`) with web-safe fallbacks, since most email clients ignore web fonts.

## Template variables

These use Supabase's Go template variables. Do not rename them:

- `{{ .ConfirmationURL }}` is the action link (confirm / reset / change).
- `{{ .NewEmail }}` is used only in `change-email.html`.

Once the custom auth domain (`auth.dormscape.us`) is live, `{{ .ConfirmationURL }}`
automatically points at `auth.dormscape.us` instead of the raw `*.supabase.co`
URL. No template edit needed. See `../auth-email-deliverability.md`.
