"use server";

import { prisma } from "@/lib/db/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request";
import { sendVerificationEmail } from "@/lib/auth/verificationEmail";
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
 * link we email them (handled by app/auth/confirm/route.ts). The auth user
 * is created with admin.generateLink({ type: "signup" }), which creates an
 * UNCONFIRMED user and returns a one-time token without emailing anyone;
 * we then send the email ourselves through Resend (lib/auth/
 * verificationEmail.ts). Until they confirm they cannot sign in, so the
 * clinic and staff rows created here are inert.
 */
export async function createClinicAction(
  input: CreateClinicInput
): Promise<{ error?: string; verificationSent?: boolean; emailFailed?: boolean }> {
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

  const admin = supabaseAdmin();
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    password,
    options: { data: { name } },
  });

  if (error || !data.user) {
    if (error?.code === "email_exists" || error?.code === "user_already_exists") {
      return { error: "An account with that email already exists — try signing in instead." };
    }
    console.error("Failed to create auth user:", error);
    return { error: "Something went wrong creating your clinic. Please try again." };
  }
  const user = data.user;

  // Belt and braces: a brand-new user must be unconfirmed. If the project
  // has auto-confirm on, verification would be meaningless, so refuse.
  if (user.email_confirmed_at) {
    console.error("Supabase auto-confirm is on — refusing to create an unverified account.");
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
    return { error: "Sign-up is temporarily unavailable. Please contact support." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const clinic = await tx.clinic.create({ data: { name: clinicName } });
      await tx.staff.create({
        data: { id: user.id, clinicId: clinic.id, name, email, role: "doctor" },
      });
    });
  } catch (err) {
    console.error("Failed to create clinic:", err);
    // Don't leave an auth user with no clinic behind.
    await admin.auth.admin.deleteUser(user.id).catch(() => {});
    return { error: "Something went wrong creating your clinic. Please try again." };
  }

  try {
    await sendVerificationEmail({ email, name, tokenHash: data.properties.hashed_token, type: "signup" });
  } catch (err) {
    // The account exists; the owner can use "Send again" on the next screen.
    console.error("Failed to send verification email:", err instanceof Error ? err.message : err);
    return { verificationSent: true, emailFailed: true };
  }

  return { verificationSent: true };
}
