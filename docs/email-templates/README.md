# Dormscape auth email templates

Paste-ready templates with Dormscape's cobalt, cream, yellow, lowercase wordmark,
and serif tagline. They share the design of the new invitation and invoice emails.

| File | Supabase template | Suggested subject |
| --- | --- | --- |
| `confirm-signup.html` | Confirm signup | `Confirm your email for Dormscape` |
| `reset-password.html` | Reset Password | `Reset your Dormscape password` |
| `change-email.html` | Change Email Address | `Confirm your new email for Dormscape` |

Supabase's magic-link and Invite user templates are not used by the app.
Workspace invitations are sent separately through Resend; see
[`../email-rollout.md`](../email-rollout.md).

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

These use conservative email markup for broad client compatibility:

- **No external images.** The layout remains legible with images blocked. The
  wordmark is styled text.
- **Table-based layout with inline styles.** Renders consistently in Gmail,
  Outlook, and Apple Mail.
- **One clear call to action** plus a visible fallback link for clients that
  strip buttons.
- **A plain-language reason line in the footer** ("You received this because...")
  so recipients know why the email arrived.
- **Brand colors** (paper `#fffdf7`, ink `#17172b`, cobalt `#304bff`, yellow
  `#ffe268`) and web-safe Arial/Georgia fonts. Tables and inline styles also
  keep the call to action readable in Outlook.

Template changes alone cannot guarantee inbox placement. Use verified SMTP
and test actual delivery and confirmation redirects after saving.

## Template variables

These use Supabase's Go template variables. Do not rename them:

- `{{ .ConfirmationURL }}` is the action link (confirm / reset / change).
- `{{ .NewEmail }}` is used only in `change-email.html`.

Once the custom auth domain (`auth.dormscape.us`) is live, `{{ .ConfirmationURL }}`
automatically points at `auth.dormscape.us` instead of the raw `*.supabase.co`
URL. No template edit needed. See `../auth-email-deliverability.md`.
