import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Landing point for the link in Supabase's confirmation email. Verifies the
// one-time token and, on success, leaves the user signed in (Supabase sets
// the session cookies), then sends them on — for a new clinic owner that's
// /dashboard, which routes them into two-step setup at /mfa.
//
// The link is built by lib/auth/verificationEmail.ts and emailed via Resend:
// /auth/confirm?token_hash=…&type=signup|magiclink&next=/dashboard. Because
// the token is verified here on the server it works from any browser or
// device. The `code` (PKCE) branch below is only a fallback.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  // Only allow same-site relative redirects (no open redirect).
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const supabase = createClient();
  let ok = false;
  if (tokenHash && type) {
    ok = !(await supabase.auth.verifyOtp({ type, token_hash: tokenHash })).error;
  } else if (code) {
    ok = !(await supabase.auth.exchangeCodeForSession(code)).error;
  }

  if (!ok) {
    return NextResponse.redirect(`${origin}/login?verify=failed`);
  }
  return NextResponse.redirect(`${origin}${next}`);
}
