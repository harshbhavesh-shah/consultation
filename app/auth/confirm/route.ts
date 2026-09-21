import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Landing point for the link in Supabase's confirmation email. Verifies the
// one-time token and, on success, leaves the user signed in (Supabase sets
// the session cookies), then sends them on — for a new clinic owner that's
// /dashboard, which routes them into two-step setup at /mfa.
//
// Supabase Dashboard → Authentication → Email Templates → "Confirm signup"
// must link here:
//   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email&next=/dashboard">
// (token_hash works from any device/browser; the default template's PKCE
// `code` link only works in the browser that started the signup — that
// case is handled below as a fallback.)
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
