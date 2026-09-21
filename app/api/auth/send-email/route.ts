import { NextResponse } from "next/server";
import { Webhook } from "standardwebhooks";
import { sendEmail } from "@/lib/email/resend";
import { confirmSignupEmail, type EmailContent } from "@/lib/email/templates";

// Supabase "Send Email" auth hook (Dashboard → Authentication → Hooks →
// Send Email → HTTPS). When enabled, Supabase does NOT send auth emails
// itself; it POSTs the details here and we send them through Resend, so the
// templates live in code (lib/email/templates.ts) instead of the dashboard.
//
// The request is signed with the Standard Webhooks scheme using the hook
// secret Supabase shows when you create the hook (SEND_EMAIL_HOOK_SECRET,
// format "v1,whsec_…"). An unsigned or tampered request is rejected, so
// this can't be used to make Loupe send arbitrary email.

interface HookPayload {
  user: { email: string; user_metadata?: { name?: string } };
  email_data: {
    token_hash: string;
    redirect_to: string;
    email_action_type: string;
    site_url: string;
  };
}

function fail(status: number, message: string) {
  // Supabase reads this shape and fails the originating auth request with it.
  return NextResponse.json({ error: { http_code: status, message } }, { status });
}

/** Where the emailed link should land. Built on our own origin (never one
 * taken from the request) and pointing at app/auth/confirm, which verifies
 * the token_hash server-side — this works from any browser or device,
 * unlike Supabase's default PKCE link. */
function buildConfirmUrl(data: HookPayload["email_data"]): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || data.site_url).replace(/\/$/, "");

  let next = "/dashboard";
  try {
    const candidate = new URL(data.redirect_to).searchParams.get("next");
    if (candidate && candidate.startsWith("/") && !candidate.startsWith("//")) next = candidate;
  } catch {
    // Malformed redirect_to — fall back to the default.
  }

  const params = new URLSearchParams({ token_hash: data.token_hash, type: data.email_action_type, next });
  return `${base}/auth/confirm?${params.toString()}`;
}

export async function POST(request: Request) {
  const secret = process.env.SEND_EMAIL_HOOK_SECRET;
  if (!secret) {
    console.error("SEND_EMAIL_HOOK_SECRET is not set; refusing to process send-email hook.");
    return fail(500, "Email hook is not configured.");
  }

  const rawBody = await request.text();
  let payload: HookPayload;
  try {
    payload = new Webhook(secret.replace(/^v1,whsec_/, "")).verify(
      rawBody,
      Object.fromEntries(request.headers)
    ) as HookPayload;
  } catch {
    return fail(401, "Invalid signature.");
  }

  const { user, email_data: data } = payload;

  // Loupe only sends signup confirmations today (staff added by a doctor are
  // pre-confirmed; there is no password reset or magic-link flow yet). Fail
  // loudly for anything else rather than silently dropping an email.
  let content: EmailContent;
  if (data.email_action_type === "signup") {
    content = confirmSignupEmail({ name: user.user_metadata?.name, confirmUrl: buildConfirmUrl(data) });
  } else {
    console.error("Send-email hook received unsupported email type:", data.email_action_type);
    return fail(400, `Unsupported email type: ${data.email_action_type}`);
  }

  try {
    await sendEmail({ to: user.email, ...content });
  } catch (err) {
    console.error("Failed to send auth email:", err instanceof Error ? err.message : err);
    return fail(502, "Couldn't send the email.");
  }

  return NextResponse.json({});
}
