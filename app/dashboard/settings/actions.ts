"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSession } from "@/lib/session";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { UserRole } from "@/types";

async function requireDoctor() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  if (session.role !== "doctor") throw new Error("Only doctors can manage staff.");
  return session;
}

// Mirrors scripts/seedClinic.mjs's account-provisioning steps (create the
// Auth user, stamp clinicId+role as custom claims, mirror into the staff
// collection) so accounts created here work identically to ones bootstrapped
// from the CLI.
export async function addStaffAction(input: {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}): Promise<{ error?: string }> {
  const session = await requireDoctor();

  const name = input.name.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!name) return { error: "Name is required." };
  if (!email) return { error: "Email is required." };
  if (password.length < 6) return { error: "Password must be at least 6 characters." };
  if (input.role !== "reception" && input.role !== "doctor") return { error: "Invalid role." };

  try {
    const userRecord = await adminAuth().createUser({ email, password, displayName: name });
    await adminAuth().setCustomUserClaims(userRecord.uid, { clinicId: session.clinicId, role: input.role });
    await adminDb().collection("staff").doc(userRecord.uid).set({
      clinicId: session.clinicId,
      uid: userRecord.uid,
      name,
      email,
      role: input.role,
      createdAt: Date.now(),
    });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "auth/email-already-exists") {
      return { error: "An account with this email already exists." };
    }
    console.error("Failed to add staff:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidateTag(`staff-${session.clinicId}`);
  revalidatePath("/dashboard/settings");
  return {};
}

export async function removeStaffAction(uid: string): Promise<{ error?: string }> {
  const session = await requireDoctor();
  if (uid === session.uid) return { error: "You can't remove your own account." };

  try {
    await adminAuth().deleteUser(uid);
    await adminDb().collection("staff").doc(uid).delete();
  } catch (err) {
    console.error("Failed to remove staff:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidateTag(`staff-${session.clinicId}`);
  revalidatePath("/dashboard/settings");
  return {};
}
