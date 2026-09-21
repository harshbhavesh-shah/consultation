"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp, getSiteUrl } from "@/lib/request";

/**
 * Replaces the old Firebase flow entirely: client-side signInWithEmailAndPassword
 * -> get an ID token -> POST it to /api/auth/session to exchange for a
 * cookie. Supabase's server client sets the session cookie as a side
 * effect of signInWithPassword itself (via the setAll callback in
 * lib/supabase/server.ts), so this one server action does the whole job —
 * no client-side auth SDK call, no separate exchange step, no
 * /api/auth/session route.
 */
export async function signInAction(email: string, password: string): Promise<{ error?: string }> {
  // Brute-force protection on top of Supabase's own per-IP limits: capped
  // per email (stops a distributed guess at one account) and per IP (stops
  // one client sweeping many accounts). Counts successful attempts too.
  const [byEmail, byIp] = await Promise.all([
    checkRateLimit({ bucket: "login-email", key: email.trim().toLowerCase(), max: 10, windowMs: 15 * 60 * 1000 }),
    checkRateLimit({ bucket: "login-ip", key: getClientIp(), max: 30, windowMs: 15 * 60 * 1000 }),
  ]);
  if (!byEmail.allowed || !byIp.allowed) {
    return { error: "Too many sign-in attempts. Please wait a few minutes and try again." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: describeAuthError(error) };
  return {};
}

/** Re-sends the signup confirmation email. Always reports success so it
 * can't be used to discover which addresses have accounts. */
export async function resendVerificationAction(email: string): Promise<{ error?: string }> {
  const normalized = email.trim().toLowerCase();
  const [byEmail, byIp] = await Promise.all([
    checkRateLimit({ bucket: "resend-email", key: normalized, max: 3, windowMs: 60 * 60 * 1000 }),
    checkRateLimit({ bucket: "resend-ip", key: getClientIp(), max: 10, windowMs: 60 * 60 * 1000 }),
  ]);
  if (!byEmail.allowed || !byIp.allowed) return { error: "Too many requests. Please try again in a while." };

  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: normalized,
    options: { emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=/dashboard` },
  });
  if (error) console.error("Failed to resend verification email:", error.code);
  return {};
}

export async function signOutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

function describeAuthError(error: { message: string; code?: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "email_not_confirmed":
      return "Please confirm your email first — check your inbox for the link we sent when you signed up.";
    case "over_request_rate_limit":
      return "Too many failed attempts. Please wait a moment and try again.";
    default:
      return error.message || "Something went wrong signing in. Please try again.";
  }
}
