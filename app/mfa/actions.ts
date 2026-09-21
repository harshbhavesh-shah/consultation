"use server";

import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";

export interface EnrollmentResult {
  error?: string;
  factorId?: string;
  qrCode?: string; // SVG data URI
  secret?: string; // same secret, for manual entry
}

async function requireAal1User() {
  const supabase = createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data) return { supabase, userId: null as string | null };
  return { supabase, userId: data.claims.sub as string };
}

/** Starts TOTP enrolment for a signed-in user who has no verified factor
 * yet. The factor stays "unverified" (and useless) until verifyMfaAction
 * succeeds with a code from the authenticator app. */
export async function startMfaEnrollmentAction(): Promise<EnrollmentResult> {
  const { supabase, userId } = await requireAal1User();
  if (!userId) return { error: "Please sign in again." };

  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: "Couldn't start setup. Please try again." };
  if (factors.totp.length > 0) return { error: "Two-factor authentication is already set up." };

  // Abandoned earlier attempts would otherwise pile up (and block re-using
  // the friendly name), so clear any unverified factors first.
  for (const f of factors.all) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    // Must be unique per user; the timestamp keeps a retry after a removed
    // device from colliding, while still reading as a sensible label.
    friendlyName: `Authenticator ${new Date().toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false })}`,
  });
  if (error || !data) {
    console.error("MFA enroll failed:", error);
    return { error: "Couldn't start setup. Please try again." };
  }
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

/** Verifies a 6-digit code against the factor (completing enrolment on
 * first use) and upgrades the session to AAL2. Cookies are refreshed as a
 * side effect of the server client. */
export async function verifyMfaAction(factorId: string, code: string): Promise<{ error?: string }> {
  const { supabase, userId } = await requireAal1User();
  if (!userId) return { error: "Please sign in again." };

  const trimmed = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) return { error: "Enter the 6-digit code from your authenticator app." };

  // A 6-digit code is only 1M guesses — cap attempts per user on top of
  // Supabase's own limits.
  const { allowed } = await checkRateLimit({ bucket: "mfa-verify", key: userId, max: 8, windowMs: 10 * 60 * 1000 });
  if (!allowed) return { error: "Too many attempts. Please wait a few minutes and try again." };

  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: trimmed });
  if (error) {
    return { error: error.code === "mfa_verification_failed" ? "That code isn't right. Try the current one." : "Couldn't verify the code. Please try again." };
  }
  return {};
}
