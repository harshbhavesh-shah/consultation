"use server";

import { getSession } from "@/lib/session";
import { getAppointmentsForDate } from "@/lib/db/appointments";
import { listClinicStaff } from "@/lib/db/staff";
import { recordAuditEvent } from "@/lib/db/auditLog";
import {
  createPatientCall,
  getPendingCalls,
  acknowledgePatientCall,
  type PatientCallRow,
} from "@/lib/db/patientCalls";
import { getNextInLine } from "@/lib/nextInLine";
import { doctorLabel } from "@/lib/staffName";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

/**
 * The doctor presses "Call in" on the next patient. The server re-derives
 * who is next for that date rather than trusting the client: if the queue
 * moved on since the page loaded, the call is refused instead of summoning
 * the wrong patient.
 */
export async function callInNextPatientAction(
  appointmentId: string,
  date: string
): Promise<{ error?: string; called?: boolean }> {
  const session = await requireSession();
  if (session.role !== "doctor") return { error: "Only a doctor can call a patient in." };

  const appointments = await getAppointmentsForDate(session.clinicId, date);
  const next = getNextInLine(appointments);
  if (!next || next.id !== appointmentId) {
    return { error: "The queue has changed — refresh to see who's next." };
  }

  let deduped: boolean;
  try {
    const staff = await listClinicStaff(session.clinicId);
    const me = staff.find((s) => s.uid === session.uid);
    ({ deduped } = await createPatientCall({
      clinicId: session.clinicId,
      appointmentId: next.id,
      patientName: next.patient_name,
      tokenNumber: next.token_number,
      calledBy: session.uid,
      calledByName: doctorLabel(me?.name) || "The doctor",
    }));
  } catch (err) {
    console.error("Failed to create patient call:", err);
    return { error: "Couldn't send the call. Please try again." };
  }

  if (!deduped) {
    // Ids only — never the patient's name — like every other audit event.
    await recordAuditEvent(session, { action: "patient.call_in", targetType: "Appointment", targetId: next.id });
  }
  return { called: true };
}

/** Unacknowledged recent calls, for a reception session that just loaded
 * (or reconnected) and may have missed the live event. */
export async function getPendingCallsAction(): Promise<PatientCallRow[]> {
  const session = await requireSession();
  return getPendingCalls(session.clinicId);
}

export async function acknowledgeCallAction(callId: string): Promise<void> {
  const session = await requireSession();
  await acknowledgePatientCall(session.clinicId, callId, session.uid);
}
