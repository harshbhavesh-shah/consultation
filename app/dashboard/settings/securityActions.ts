"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { recordAuditEvent } from "@/lib/db/auditLog";
import type { EnrollmentResult } from "@/app/mfa/actions";

// Managing authenticator devices from Settings. getSession() only returns a
// session for a doctor who has already completed two-step verification this
// sign-in (AAL2), which is also what Supabase requires to enrol or remove a
// factor when one is already verified — so a stolen password alone can't add
// the attacker's own device.

async function requireDoctor() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  if (session.role !== "doctor") throw new Error("Only doctors manage two-step verification.");
  return session;
}

/** Begins enrolling an additional authenticator. The new device is unusable
 * until confirmAddDeviceAction verifies a code from it. */
export async function startAddDeviceAction(deviceName: string): Promise<EnrollmentResult> {
  await requireDoctor();
  const name = deviceName.trim().slice(0, 40) || "Backup device";
  const supabase = createClient();

  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: "Couldn't start setup. Please try again." };
  if (factors.totp.some((f) => f.friendly_name === name)) {
    return { error: "You already have a device with that name — choose another." };
  }

  // Clear abandoned attempts so they don't pile up or hold a name.
  for (const f of factors.all) {
    if (f.factor_type === "totp" && f.status === "unverified") {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: name });
  if (error || !data) {
    console.error("Add MFA device failed:", error);
    return { error: "Couldn't start setup. Please try again." };
  }
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret };
}

export async function confirmAddDeviceAction(factorId: string, code: string): Promise<{ error?: string }> {
  const session = await requireDoctor();
  const trimmed = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(trimmed)) return { error: "Enter the 6-digit code from the new device." };

  const { allowed } = await checkRateLimit({ bucket: "mfa-verify", key: session.uid, max: 8, windowMs: 10 * 60 * 1000 });
  if (!allowed) return { error: "Too many attempts. Please wait a few minutes and try again." };

  const supabase = createClient();
  const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: trimmed });
  if (error) {
    return { error: error.code === "mfa_verification_failed" ? "That code isn't right. Try the current one." : "Couldn't verify the code. Please try again." };
  }

  await recordAuditEvent(session, { action: "mfa.device_add", targetType: "Staff", targetId: session.uid });
  revalidatePath("/dashboard/settings");
  return {};
}

export async function removeDeviceAction(factorId: string): Promise<{ error?: string }> {
  const session = await requireDoctor();
  const supabase = createClient();

  const { data: factors, error: listError } = await supabase.auth.mfa.listFactors();
  if (listError) return { error: "Something went wrong. Please try again." };
  if (!factors.totp.some((f) => f.id === factorId)) return { error: "Device not found." };
  // Removing the last one would lock the doctor out of the dashboard.
  if (factors.totp.length <= 1) return { error: "You need at least one authenticator device." };

  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) {
    console.error("Remove MFA device failed:", error);
    return { error: "Couldn't remove the device. Please try again." };
  }

  await recordAuditEvent(session, { action: "mfa.device_remove", targetType: "Staff", targetId: session.uid });
  revalidatePath("/dashboard/settings");
  return {};
}
