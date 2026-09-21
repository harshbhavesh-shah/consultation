# Auth emails via Resend

Loupe sends its auth emails (currently: signup confirmation, including
"send again") through Resend, using Supabase's **Send Email hook**. With the
hook on, Supabase stops sending mail itself and calls
`POST /api/auth/send-email`; that route verifies the request signature,
builds the link, and sends via the Resend API. Templates live in
`lib/email/templates.ts`.

## One-time setup

1. **Resend:** create an API key → `RESEND_KEY_ID`. For real delivery, add and
   verify your sending domain in Resend, then set `RESEND_FROM_EMAIL`, e.g.
   `Loupe <no-reply@yourdomain.in>`. (Without a verified domain Resend only
   delivers to your own account's address — fine for development.)
2. **Supabase → Authentication → Sign In / Providers → Email:** "Confirm
   email" **on**.
3. **Supabase → Authentication → URL Configuration:** set Site URL to your app
   URL and add `<your app URL>/auth/confirm` to Redirect URLs.
4. **Supabase → Authentication → Hooks → Send Email:** enable, type
   **HTTPS**, URL `https://<your app>/api/auth/send-email`, and **generate
   the secret** → copy it (`v1,whsec_…`) into `SEND_EMAIL_HOOK_SECRET`.
5. Set `RESEND_KEY_ID`, `RESEND_FROM_EMAIL`, `SEND_EMAIL_HOOK_SECRET` and
   `NEXT_PUBLIC_SITE_URL` in Vercel and redeploy **before** enabling the
   hook — once it's on, signup fails until the route can send.

The dashboard's own "Confirm signup" template is no longer used.

## Testing locally

Supabase can't call `localhost`, so expose your dev server with a tunnel
(`ngrok http 3000`), use the tunnel URL as the hook URL (step 4) and as
`NEXT_PUBLIC_SITE_URL`. Or skip the hook locally by turning "Confirm email"
off and `MFA_ENFORCED=false` — but then email verification isn't exercised.

## Behaviour to know

- If Resend fails, the route returns an error and Supabase fails the signup
  request; the visitor sees "Something went wrong". Retrying re-sends the
  email to the same (still unconfirmed) account.
- Only `signup` emails are supported. Other types (password reset, magic
  link, email change) are rejected with a 400 until templates are added in
  `lib/email/templates.ts` and handled in the route.
- Never log the token or link; the route logs only error types.
