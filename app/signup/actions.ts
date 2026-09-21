"use server";

import { prisma } from "@/lib/db/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp, getSiteUrl } from "@/lib/request";
import { verifyTurnstileToken } from "@/lib/turnstile";

const MIN_PASSWORD_LENGTH = 8;

export interface CreateClinicInput {
  clinicName: string;
  name: string;
  email: string;
  password: string;
  turnstileToken: string;
}

/**
 * Self-serve version of scripts/seedClinic.mjs — creates a brand new
 * clinic (tenant) plus its first staff account, provisioned as 'doctor'
 * (the clinic owner).
 *
 * The email address is NOT trusted until the owner clicks the confirmation
 * link Supabase emails them (handled by app/auth/confirm/route.ts), so this
 * uses signUp() — which sends that email — rather than the admin
 * createUser({ email_confirm: true }) it used before, which marked every
 * address verified without checking it. Until they confirm they cannot sign
 * in, so the clinic and staff rows created here are inert.
 *
 * Requires "Confirm email" to be ON in Supabase → Authentication → Sign In
 * / Providers → Email. If it's off, signUp returns a live session; in
 * production that's treated as a misconfiguration and refused.
 */
export async function createClinicAction(
  input: CreateClinicInput
): Promise<{ error?: string; verificationSent?: boolean }> {
  const ip = getClientIp();
  const { allowed } = await checkRateLimit({ bucket: "signup", key: ip, max: 5, windowMs: 60 * 60 * 1000 });
  if (!allowed) return { error: "Too many sign-up attempts. Please try again later." };
  if (!(await verifyTurnstileToken(input.turnstileToken, ip))) {
    return { error: "Please complete the verification challenge and try again." };
  }

  const clinicName = input.clinicName.trim();
  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!clinicName || !name || !email || !password) {
    return { error: "Please fill in all fields." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name }, emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=/dashboard` },
  });

  if (error || !data.user) {
    if (error?.code === "user_already_exists" || error?.code === "email_exists") {
      return { error: "An account with that email already exists — try signing in instead." };
    }
    console.error("Failed to sign up:", error);
    return { error: "Something went wrong creating your clinic. Please try again." };
  }
  // With "Confirm email" on, signing up an address that already has an
  // account returns a user with no identities instead of an error (so the
  // API doesn't reveal which emails exist). Never attach a new clinic to
  // that other person's account.
  if (data.user.identities?.length === 0) {
    return { error: "An account with that email already exists — try signing in instead." };
  }
  if (data.session && process.env.NODE_ENV === "production") {
    console.error("Supabase 'Confirm email' is disabled — refusing to create an unverified account.");
    await supabaseAdmin().auth.admin.deleteUser(data.user.id).catch(() => {});
    return { error: "Sign-up is temporarily unavailable. Please contact support." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({ data: { name: clinicName } });
      await tx.staff.create({
        data: { id: data.user!.id, clinicId: clinic.id, name, email, role: "doctor" },
      });
    });
  } catch (err) {
    console.error("Failed to create clinic:", err);
    // Don't leave an auth user with no clinic behind.
    await supabaseAdmin().auth.admin.deleteUser(data.user.id).catch(() => {});
    return { error: "Something went wrong creating your clinic. Please try again." };
  }

  // A session only exists here in dev with confirmation switched off; the
  // caller then just proceeds to sign in as before.
  return { verificationSent: !data.session };
}
