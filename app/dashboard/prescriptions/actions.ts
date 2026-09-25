"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getAppointment } from "@/lib/db/appointments";
import {
  savePrescription,
  saveTemplate,
  deleteTemplate,
  sanitizeAdvice,
  sanitizeMedications,
} from "@/lib/db/prescriptions";
import { recordAuditEvent } from "@/lib/db/auditLog";
import type { Medication, PrescriptionTemplate } from "@/types";

export async function savePrescriptionAction(
  appointmentId: string,
  medications: Medication[],
  advice: string
): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };
  if (session.role !== "doctor") return { error: "Only a doctor can write a prescription." };

  const appointment = await getAppointment(session.clinicId, appointmentId);
  if (!appointment) return { error: "Appointment not found." };

  await savePrescription(
    session.clinicId,
    appointmentId,
    session.uid,
    sanitizeMedications(medications),
    sanitizeAdvice(advice)
  );
  // Ids only: no drug names or diagnoses in the audit trail.
  await recordAuditEvent(session, { action: "prescription.save", targetType: "Appointment", targetId: appointmentId });
  revalidatePath(`/dashboard/prescriptions/${appointmentId}`);
  return {};
}

export async function saveTemplateAction(
  name: string,
  medications: Medication[],
  advice: string
): Promise<{ error?: string; template?: PrescriptionTemplate }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };
  if (session.role !== "doctor") return { error: "Only a doctor can save templates." };

  const cleanName = typeof name === "string" ? name.trim().slice(0, 80) : "";
  if (!cleanName) return { error: "Give the template a name." };
  const meds = sanitizeMedications(medications);
  if (meds.length === 0) return { error: "Add at least one medicine first." };

  const template = await saveTemplate(session.clinicId, session.uid, cleanName, meds, sanitizeAdvice(advice));
  await recordAuditEvent(session, { action: "prescription_template.save", targetType: "PrescriptionTemplate", targetId: template.id });
  return { template };
}

export async function deleteTemplateAction(id: string): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };
  if (session.role !== "doctor") return { error: "Only a doctor can delete templates." };
  await deleteTemplate(session.clinicId, id);
  await recordAuditEvent(session, { action: "prescription_template.delete", targetType: "PrescriptionTemplate", targetId: id });
  return {};
}
