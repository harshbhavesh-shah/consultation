# Auth emails via Resend

Loupe sends its own signup-confirmation emails through Resend. Supabase
sends nothing.

How it works:

1. Signup calls `supabaseAdmin().auth.admin.generateLink({ type: "signup" })`,
   which creates an **unconfirmed** user and returns a one-time token —
   without emailing anyone.
2. `lib/auth/verificationEmail.ts` emails a link to
   `/auth/confirm?token_hash=…` (template: `lib/email/templates.ts`).
3. `app/auth/confirm/route.ts` verifies the token server-side, which
   confirms the email and signs the user in. It works from any browser.
4. "Send again" generates a fresh `magiclink` token for the same
   still-unconfirmed account (verifying it also confirms the email).

## Setup

1. **Resend:** dashboard → API Keys → create a key → `RESEND_KEY_ID`. For real
   delivery, add and verify your sending domain (Resend → Domains), then set
   `RESEND_FROM_EMAIL`, e.g. `Loupe <no-reply@yourdomain.in>`. Without a
   verified domain Resend only delivers to your own account's address.
2. **Supabase:** nothing to configure for email. (Optionally set Site URL and
   add `<your app URL>/auth/confirm` to Redirect URLs; not required.) Do
   **not** turn on auto-confirm — signup refuses to run if it is on.
3. Set `RESEND_KEY_ID` and `RESEND_FROM_EMAIL` in Vercel (Production and
   Preview) and redeploy. `NEXT_PUBLIC_SITE_URL` is optional; links use the
   request host if it is unset.

## Behaviour to know

- If Resend fails right after signup, the account still exists and the
  "check your email" screen tells the user to press "Send the email again".
- "Send again" only acts on an existing, unconfirmed clinic owner and always
  reports success, so it can't be used to discover which emails have accounts.
- Only signup confirmation exists today. Password reset and other emails
  would be added the same way: `generateLink`, then a template, then
  `sendEmail`.
- Never log the token or link.
