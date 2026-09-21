import "server-only";
import { sendEmail } from "@/lib/email/resend";
import { confirmSignupEmail } from "@/lib/email/templates";
import { getSiteUrl } from "@/lib/request";

/**
 * Emails the "confirm your email" link ourselves, via Resend.
 *
 * Supabase never sends this email: callers get the one-time token from
 * supabaseAdmin().auth.admin.generateLink() (which only creates the token,
 * it doesn't email anyone) and hand it here. The link goes to our own
 * app/auth/confirm route, which verifies the token server-side, so it works
 * from any browser or device.
 *
 * `type` is "signup" for the first email and "magiclink" for "send again"
 * (a fresh token for the same still-unconfirmed account; verifying either
 * marks the email confirmed and signs the user in).
 */
export async function sendVerificationEmail(opts: {
  email: string;
  name?: string;
  tokenHash: string;
  type: "signup" | "magiclink";
}): Promise<void> {
  const params = new URLSearchParams({ token_hash: opts.tokenHash, type: opts.type, next: "/dashboard" });
  const confirmUrl = `${getSiteUrl()}/auth/confirm?${params.toString()}`;
  await sendEmail({ to: opts.email, ...confirmSignupEmail({ name: opts.name, confirmUrl }) });
}
