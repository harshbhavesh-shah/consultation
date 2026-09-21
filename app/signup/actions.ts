"use server";

import { prisma } from "@/lib/db/client";
import { supabaseAdmin } from "@/lib/supabase/admin";

export interface CreateClinicInput {
  clinicName: string;
  name: string;
  email: string;
  password: string;
}

/**
 * Self-serve version of scripts/seedClinic.mjs — creates a brand new
 * clinic (tenant) plus its first staff account, provisioned as 'doctor'
 * (the clinic owner). Clinic + Staff live in Postgres — the auth claims
 * hook (prisma/migrations/20260920180000_auth_rls_and_claims_hook) reads
 * `staff` to put clinic_id/staff_role on the JWT, and getClinic()/
 * listClinicStaff() now read Postgres too, so no Firestore mirror is
 * needed here anymore.
 */
export async function createClinicAction(
  input: CreateClinicInput
): Promise<{ error?: string }> {
  const clinicName = input.clinicName.trim();
  const name = input.name.trim();
  const email = input.email.trim();
  const password = input.password;

  if (!clinicName || !name || !email || !password) {
    return { error: "Please fill in all fields." };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters." };
  }

  const clinic = await prisma.clinic.create({ data: { name: clinicName } });

  try {
    const { data: userData, error: userError } = await supabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (userError || !userData.user) {
      if (userError?.code === "email_exists") {
        return { error: "An account with that email already exists — try signing in instead." };
      }
      console.error("Failed to create Supabase auth user:", userError);
      return { error: "Something went wrong creating your clinic. Please try again." };
    }

    await prisma.staff.create({
      data: { id: userData.user.id, clinicId: clinic.id, name, email, role: "doctor" },
    });

    return {};
  } catch (err) {
    console.error("Failed to create clinic:", err);
    // Best-effort cleanup — the clinic row is orphaned without a staff
    // member if anything above failed.
    await prisma.clinic.delete({ where: { id: clinic.id } }).catch(() => {});
    return { error: "Something went wrong creating your clinic. Please try again." };
  }
}
