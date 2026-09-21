"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  searchPatients,
  getPatientById,
  checkPatientRetentionFloor,
  erasePatient,
  RETENTION_YEARS,
} from "@/lib/db/patients";
import { recordAuditEvent } from "@/lib/db/auditLog";
import { getCallbacksDueToday, updateAppointment, getAppointment } from "@/lib/db/appointments";
import type { Patient } from "@/types";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

export async function searchPatientsAction(term: string): Promise<Patient[]> {
  const session = await requireSession();
  return searchPatients(session.clinicId, term);
}

export async function getCallbacksDueTodayAction() {
  const session = await requireSession();
  const today = new Date().toISOString().slice(0, 10);
  return getCallbacksDueToday(session.clinicId, today);
}

export async function markCallbackDoneAction(appointmentId: string): Promise<{ error?: string }> {
  const session = await requireSession();
  const appointment = await getAppointment(session.clinicId, appointmentId);
  if (!appointment) return { error: "Appointment not found." };

  const today = new Date().toISOString().slice(0, 10);
  await updateAppointment(session.clinicId, appointmentId, {
    call_back_due_date: null,
    call_back_completed_at: today,
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/patients");
  return {};
}

export async function erasePatientAction(patientId: string, confirmName: string): Promise<{ error?: string }> {
  const session = await requireSession();
  if (session.role !== "doctor") return { error: "Only a doctor can erase a patient record." };

  const patient = await getPatientById(session.clinicId, patientId);
  if (!patient) return { error: "Patient not found." };
  if (confirmName.trim().toLowerCase() !== patient.name.trim().toLowerCase()) {
    return { error: "Type the patient's full name to confirm." };
  }

  const eligibleOn = await checkPatientRetentionFloor(session.clinicId, patientId);
  if (eligibleOn) {
    return {
      error: `Medical records must be kept for ${RETENTION_YEARS} years after the last visit. This record can be erased on or after ${eligibleOn}.`,
    };
  }

  await erasePatient(session.clinicId, patientId);
  // Ids only — the audit trail must not become another copy of the data
  // that was just erased.
  await recordAuditEvent(session, { action: "patient.erase", targetType: "Patient", targetId: patientId });
  revalidatePath("/dashboard/patients");
  revalidatePath("/dashboard/appointments");
  return {};
}
