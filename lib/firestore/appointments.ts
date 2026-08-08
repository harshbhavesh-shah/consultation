import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { Appointment, AppointmentStatus } from "@/types";

function toAppointment(doc: FirebaseFirestore.QueryDocumentSnapshot): Appointment {
  const data = doc.data();
  return {
    id: doc.id,
    clinicId: data.clinicId,
    appointment_date: data.appointment_date,
    appointment_time: data.appointment_time,
    status: data.status,
    entry_source: data.entry_source,
    token_number: data.token_number ?? 0,
    shift: data.shift,
    patientId: data.patientId ?? null,
    patient_name: data.patient_name ?? "",
    patient_phone: data.patient_phone ?? "",
    patient_address: data.patient_address ?? "",
    age: data.age ?? "",
    age_unit: data.age_unit ?? "years",
    gender: data.gender ?? "",
    payment: data.payment ?? "",
    payment_type: data.payment_type ?? "",
    reference: data.reference ?? "",
    diagnosis: data.diagnosis ?? "",
    follow_up: data.follow_up ?? "",
    follow_up_sent: data.follow_up_sent ?? false,
    follow_up_day_before_sent: data.follow_up_day_before_sent ?? false,
    call_back: data.call_back ?? "",
    call_back_due_date: data.call_back_due_date ?? null,
    call_back_completed_at: data.call_back_completed_at ?? null,
    createdAt: data.createdAt,
    createdBy: data.createdBy ?? "",
  };
}

export async function getAppointmentsForDate(clinicId: string, date: string): Promise<Appointment[]> {
  const snap = await adminDb()
    .collection("appointments")
    .where("clinicId", "==", clinicId)
    .where("appointment_date", "==", date)
    .get();
  return snap.docs.map(toAppointment).sort((a, b) => a.appointment_time.localeCompare(b.appointment_time));
}

export async function getAppointment(clinicId: string, id: string): Promise<Appointment | null> {
  const doc = await adminDb().collection("appointments").doc(id).get();
  if (!doc.exists || doc.data()?.clinicId !== clinicId) return null;
  return toAppointment(doc as FirebaseFirestore.QueryDocumentSnapshot);
}

export async function createAppointment(
  clinicId: string,
  input: Omit<Appointment, "id" | "clinicId" | "createdAt" | "token_number" | "shift">
): Promise<string> {
  const ref = adminDb().collection("appointments").doc();
  await ref.set({ ...input, clinicId, createdAt: Date.now(), token_number: 0, shift: "morning" });
  return ref.id;
}

export async function updateAppointment(
  clinicId: string,
  id: string,
  patch: Partial<Appointment>
): Promise<void> {
  const ref = adminDb().collection("appointments").doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.clinicId !== clinicId) throw new Error("Appointment not found");
  const safePatch = { ...patch };
  delete safePatch.id;
  delete safePatch.clinicId;
  await ref.update(safePatch);
}

export async function deleteAppointment(clinicId: string, id: string): Promise<void> {
  const ref = adminDb().collection("appointments").doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.clinicId !== clinicId) throw new Error("Appointment not found");
  await ref.delete();
}

export async function findAppointmentsByPhone(
  clinicId: string,
  phone: string,
  max = 20
): Promise<Appointment[]> {
  const snap = await adminDb()
    .collection("appointments")
    .where("clinicId", "==", clinicId)
    .where("patient_phone", "==", phone)
    .orderBy("createdAt", "desc")
    .limit(max)
    .get();
  return snap.docs.map(toAppointment);
}

export async function getAppointmentsByPatientId(clinicId: string, patientId: string): Promise<Appointment[]> {
  const snap = await adminDb()
    .collection("appointments")
    .where("clinicId", "==", clinicId)
    .where("patientId", "==", patientId)
    .get();
  return snap.docs
    .map(toAppointment)
    .sort((a, b) => (a.appointment_date + a.appointment_time < b.appointment_date + b.appointment_time ? 1 : -1));
}

export async function getCallbacksDueToday(clinicId: string, today: string): Promise<Appointment[]> {
  const snap = await adminDb()
    .collection("appointments")
    .where("clinicId", "==", clinicId)
    .where("call_back_due_date", "==", today)
    .get();
  return snap.docs.map(toAppointment);
}

export async function getAppointmentsInRange(
  clinicId: string,
  fromDate: string,
  toDate: string
): Promise<Appointment[]> {
  const snap = await adminDb()
    .collection("appointments")
    .where("clinicId", "==", clinicId)
    .where("appointment_date", ">=", fromDate)
    .where("appointment_date", "<=", toDate)
    .get();
  return snap.docs.map(toAppointment);
}

export function isLockedForReception(status: AppointmentStatus): boolean {
  return status === "Visited";
}
