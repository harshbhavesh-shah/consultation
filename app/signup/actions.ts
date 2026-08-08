"use server";

import { adminAuth, adminDb } from "@/lib/firebase/admin";

export interface CreateClinicInput {
  clinicName: string;
  name: string;
  email: string;
  password: string;
}

/**
 * Self-serve version of scripts/seedClinic.mjs — creates a brand new
 * clinic (tenant) plus its first staff account, provisioned as 'doctor'
 * (the clinic owner). Same Admin SDK calls, just triggered from the UI
 * instead of the CLI.
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

  try {
    const clinicRef = adminDb().collection("clinics").doc();
    await clinicRef.set({ name: clinicName, createdAt: Date.now() });

    const userRecord = await adminAuth().createUser({ email, password, displayName: name });

    await adminAuth().setCustomUserClaims(userRecord.uid, {
      clinicId: clinicRef.id,
      role: "doctor",
    });

    await adminDb().collection("staff").doc(userRecord.uid).set({
      clinicId: clinicRef.id,
      uid: userRecord.uid,
      name,
      email,
      role: "doctor",
      createdAt: Date.now(),
    });

    return {};
  } catch (err) {
    const code = (err as { code?: string })?.code ?? "";
    if (code === "auth/email-already-exists") {
      return { error: "An account with that email already exists — try signing in instead." };
    }
    console.error("Failed to create clinic:", err);
    return { error: "Something went wrong creating your clinic. Please try again." };
  }
}
