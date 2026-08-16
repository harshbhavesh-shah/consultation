"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  getAppointment,
  updateAppointment,
  deleteAppointment as deleteAppointmentDb,
  createAppointment,
  isLockedForReception,
} from "@/lib/firestore/appointments";
import { reassignDailyTokens, countStillWaitingAhead } from "@/lib/tokenQueue";
import { findPatientsByPhone, createPatient } from "@/lib/firestore/patients";
import {
  getAppointmentsForDate,
  getAppointmentsInRange,
  getAppointmentsByPatientId,
  findAppointmentsByPhone,
} from "@/lib/firestore/appointments";
import { computeCallBackDueDate } from "@/lib/followups";
import type { Appointment } from "@/types";

// Fields reception can no longer touch once an appointment is marked
// Visited — mirrors firestore.rules' appointmentLockedFieldsUnchanged(),
// which is the real enforcement boundary; this check just gives a clean
// error message instead of a raw permission-denied.
const LOCKED_FIELDS = [
  "payment",
  "payment_type",
  "reference",
  "diagnosis",
  "follow_up",
  "call_back",
] as const;

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

export async function updateAppointmentFieldAction(
  id: string,
  patch: Partial<Appointment>
): Promise<{ error?: string }> {
  const session = await requireSession();
  const appointment = await getAppointment(session.clinicId, id);
  if (!appointment) return { error: "Appointment not found." };

  if (session.role === "reception" && isLockedForReception(appointment.status)) {
    const touchesLockedField = LOCKED_FIELDS.some((f) => f in patch);
    if (touchesLockedField) {
      return { error: "This visit is already marked done — only a doctor can edit it now." };
    }
  }

  // Editing follow_up resets the "sent" flags so an external reminder
  // process re-notifies on the new schedule.
  if ("follow_up" in patch) {
    patch.follow_up_sent = false;
    patch.follow_up_day_before_sent = false;
  }

  // Recompute call_back_due_date whenever call_back changes.
  if ("call_back" in patch) {
    patch.call_back_due_date = computeCallBackDueDate(appointment.appointment_date, patch.call_back ?? "");
  }

  await updateAppointment(session.clinicId, id, patch);
  revalidatePath("/dashboard/appointments");
  return {};
}

export async function toggleVisitedAction(id: string, visited: boolean): Promise<{ error?: string }> {
  const session = await requireSession();
  const appointment = await getAppointment(session.clinicId, id);
  if (!appointment) return { error: "Appointment not found." };

  // Reception can mark a visit done, but can't undo that once it's set —
  // reopening a completed visit is a doctor-only action, same as the other
  // locked fields.
  if (session.role === "reception" && appointment.status === "Visited" && !visited) {
    return { error: "Only a doctor can reopen a completed visit." };
  }

  await updateAppointment(session.clinicId, id, { status: visited ? "Visited" : "Booked" });
  revalidatePath("/dashboard/appointments");
  return {};
}

export async function deleteAppointmentAction(id: string, date: string): Promise<{ error?: string }> {
  const session = await requireSession();
  if (session.role !== "doctor") return { error: "Only a doctor can delete an appointment." };

  await deleteAppointmentDb(session.clinicId, id);
  await reassignDailyTokens(session.clinicId, date);
  revalidatePath("/dashboard/appointments");
  return {};
}

export interface WalkInInput {
  date: string;
  time: string;
  name: string;
  phone: string;
  address: string;
  age: number | "";
  age_unit: "years" | "months";
  gender: "Male" | "Female" | "Other" | "";
  payment: number | "";
  payment_type: "Cash" | "Online" | "";
  reference: string;
  patientId: string | null;
}

export interface WalkInResult {
  error?: string;
  token?: number;
  ahead?: number;
}

export async function createWalkInAction(input: WalkInInput): Promise<WalkInResult> {
  const session = await requireSession();
  if (!input.name.trim() || !input.phone.trim()) return { error: "Name and phone are required." };

  let patientId = input.patientId;
  if (!patientId) {
    const matches = await findPatientsByPhone(session.clinicId, input.phone.trim());
    const exact = matches.find((p) => p.name.toLowerCase() === input.name.trim().toLowerCase());
    if (exact) {
      patientId = exact.id;
    } else {
      const created = await createPatient(session.clinicId, {
        name: input.name.trim(),
        phone: input.phone.trim(),
        address: input.address,
        age: input.age,
        age_unit: input.age_unit,
        gender: input.gender,
      });
      patientId = created.id;
    }
  }

  const id = await createAppointment(session.clinicId, {
    appointment_date: input.date,
    appointment_time: input.time,
    status: "Booked",
    entry_source: "walkin",
    patientId,
    patient_name: input.name.trim(),
    patient_phone: input.phone.trim(),
    patient_address: input.address,
    age: input.age,
    age_unit: input.age_unit,
    gender: input.gender,
    payment: input.payment,
    payment_type: input.payment_type,
    reference: input.reference,
    diagnosis: "",
    follow_up: "",
    follow_up_sent: false,
    follow_up_day_before_sent: false,
    call_back: "",
    call_back_due_date: null,
    call_back_completed_at: null,
    createdBy: session.uid,
  });

  const entries = await reassignDailyTokens(session.clinicId, input.date);
  const ahead = countStillWaitingAhead(entries, id);
  const mine = entries.find((e) => e.id === id);

  revalidatePath("/dashboard/appointments");
  return { token: mine?.token_number ?? 0, ahead };
}

export interface EditWalkInInput extends WalkInInput {
  id: string;
}

export async function editAppointmentAction(input: EditWalkInInput): Promise<WalkInResult> {
  const session = await requireSession();
  const existing = await getAppointment(session.clinicId, input.id);
  if (!existing) return { error: "Appointment not found." };

  if (session.role === "reception" && isLockedForReception(existing.status)) {
    return { error: "This visit is already marked done — only a doctor can edit it now." };
  }

  await updateAppointment(session.clinicId, input.id, {
    appointment_date: input.date,
    appointment_time: input.time,
    patient_name: input.name.trim(),
    patient_phone: input.phone.trim(),
    patient_address: input.address,
    age: input.age,
    age_unit: input.age_unit,
    gender: input.gender,
    payment: input.payment,
    payment_type: input.payment_type,
    reference: input.reference,
  });

  // If the date changed, both the old and new day's queues need
  // renumbering to close the gap left behind and fit the arrival in.
  if (existing.appointment_date !== input.date) {
    await reassignDailyTokens(session.clinicId, existing.appointment_date);
  }
  const entries = await reassignDailyTokens(session.clinicId, input.date);
  const ahead = countStillWaitingAhead(entries, input.id);
  const mine = entries.find((e) => e.id === input.id);

  revalidatePath("/dashboard/appointments");
  return { token: mine?.token_number ?? 0, ahead };
}

export interface PatientLookupMatch {
  patientDocId: string;
  name: string;
  address: string;
  age: number | "";
  age_unit: "years" | "months";
  gender: "Male" | "Female" | "Other" | "";
  lastVisitDate: string | null;
}

/** Returning-patient lookup by phone — groups by name so the form can
 * autofill a single unambiguous match or ask which patient when a phone
 * number is shared (e.g. a family). */
export async function lookupPatientsByPhoneAction(phone: string): Promise<PatientLookupMatch[]> {
  const session = await requireSession();
  const trimmed = phone.trim();
  if (trimmed.length < 6) return [];

  const matches = await findPatientsByPhone(session.clinicId, trimmed);
  return matches.map((p) => ({
    patientDocId: p.id,
    name: p.name,
    address: p.address,
    age: p.age,
    age_unit: p.age_unit,
    gender: p.gender,
    lastVisitDate: null,
  }));
}

/**
 * Drag-to-reorder within a shift. The dragged row's new visual position
 * expresses "this patient should be seen before/after that one" — rather
 * than inventing new time values (which could collide with someone else's
 * slot), this keeps the same set of time slots already held by this group
 * of appointments and reassigns them across the new order, then lets
 * reassignDailyTokens recompute token numbers from the result.
 */
export async function reorderAppointmentsAction(
  date: string,
  orderedIds: string[]
): Promise<{ error?: string }> {
  const session = await requireSession();
  if (orderedIds.length < 2) return {};

  const appointments = await Promise.all(orderedIds.map((id) => getAppointment(session.clinicId, id)));
  if (appointments.some((a) => !a)) return { error: "One of these appointments no longer exists." };

  const locked = appointments.find(
    (a) => a!.status === "Visited" && session.role === "reception"
  );
  if (locked) return { error: "A completed visit can't be reordered by reception." };

  const sortedTimes = appointments.map((a) => a!.appointment_time).sort();

  await Promise.all(
    orderedIds.map((id, i) => updateAppointment(session.clinicId, id, { appointment_time: sortedTimes[i] }))
  );

  await reassignDailyTokens(session.clinicId, date);
  revalidatePath("/dashboard/appointments");
  return {};
}

export async function getBookedTimesForDateAction(date: string, excludeId?: string): Promise<string[]> {
  const session = await requireSession();
  const appointments = await getAppointmentsForDate(session.clinicId, date);
  return appointments
    .filter((a) => a.status !== "Cancelled" && a.id !== excludeId)
    .map((a) => a.appointment_time);
}

/** Backs the calendar view (day/week/month) — fetches whatever date range
 * is currently visible, refetched client-side as the user navigates
 * instead of loading the whole clinic's appointment history at once. */
export async function getAppointmentsInRangeAction(fromDate: string, toDate: string): Promise<Appointment[]> {
  const session = await requireSession();
  return getAppointmentsInRange(session.clinicId, fromDate, toDate);
}

/** Backs the calendar mini panel's "Past Visits" section. Prefers
 * patientId (linked record) when available since it's exact; falls back to
 * phone-number matching for online/legacy-synced appointments that were
 * never linked to a Patient record. Excludes the appointment being viewed
 * and anything not yet in the past, newest first. */
export async function getPatientHistoryAction(
  patientId: string | null,
  phone: string,
  excludeAppointmentId: string,
  beforeDate: string
): Promise<Appointment[]> {
  const session = await requireSession();
  const all = patientId
    ? await getAppointmentsByPatientId(session.clinicId, patientId)
    : await findAppointmentsByPhone(session.clinicId, phone);

  return all
    .filter((a) => a.id !== excludeAppointmentId && a.appointment_date <= beforeDate)
    .sort((a, b) => (a.appointment_date + a.appointment_time < b.appointment_date + b.appointment_time ? 1 : -1))
    .slice(0, 5);
}
