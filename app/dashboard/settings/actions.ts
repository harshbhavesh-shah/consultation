"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db/client";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { UserRole } from "@/types";

async function requireDoctor() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  if (session.role !== "doctor") throw new Error("Only doctors can manage staff.");
  return session;
}

// Mirrors scripts/seedClinic.mjs's account-provisioning steps (create the
// Supabase Auth user, create the Postgres staff row the claims hook reads)
// so accounts created here work identically to ones bootstrapped from the
// CLI.
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
    const { data: userData, error: userError } = await supabaseAdmin().auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });
    if (userError || !userData.user) {
      if (userError?.code === "email_exists") {
        return { error: "An account with this email already exists." };
      }
      console.error("Failed to add staff:", userError);
      return { error: "Something went wrong. Please try again." };
    }

    await prisma.staff.create({
      data: { id: userData.user.id, clinicId: session.clinicId, name, email, role: input.role },
    });
  } catch (err) {
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
    await supabaseAdmin().auth.admin.deleteUser(uid);
    await prisma.staff.delete({ where: { id: uid } }).catch(() => {});
  } catch (err) {
    console.error("Failed to remove staff:", err);
    return { error: "Something went wrong. Please try again." };
  }

  revalidateTag(`staff-${session.clinicId}`);
  revalidatePath("/dashboard/settings");
  return {};
}
