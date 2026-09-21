import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "./client";
import type { Appointment as PrismaAppointment, Prisma } from "@prisma/client";
import type { Appointment, AppointmentStatus } from "@/types";

// Every read below that's cached is tagged `appointments-${clinicId}` and
// every write below revalidates that same tag, so a change is visible to
// the writer immediately and to everyone else within the revalidate
// window. The time-based `revalidate` is just a safety net for writes that
// bypass these functions entirely (reassignDailyTokens in lib/tokenQueue.ts
// batch-updates token_number/shift directly and revalidates the same tag).
function appointmentsTag(clinicId: string): string {
  return `appointments-${clinicId}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The translation boundary — Postgres stores payment/age/follow_up/call_back
// as real nullable numerics (not Firestore's "" sentinel) and createdAt as
// a native timestamp (not epoch-ms). This is the only place that converts
// between what Postgres correctly stores and the `Appointment` shape every
// caller across the app already expects.
function toAppointment(row: PrismaAppointment): Appointment {
  return {
    id: row.id,
    clinicId: row.clinicId,
    appointment_date: row.appointmentDate,
    appointment_time: row.appointmentTime,
    status: row.status,
    entry_source: row.entrySource,
    token_number: row.tokenNumber,
    shift: row.shift,
    patientId: row.patientId,
    patient_name: row.patientName,
    patient_phone: row.patientPhone,
    patient_address: row.patientAddress,
    age: row.age ?? "",
    age_unit: row.ageUnit,
    gender: row.gender ?? "",
    payment: row.payment === null ? "" : row.payment.toNumber(),
    payment_type: row.paymentType ?? "",
    reference: row.reference,
    diagnosis: row.diagnosis,
    follow_up: row.followUp ?? "",
    follow_up_sent: row.followUpSent,
    follow_up_day_before_sent: row.followUpDayBeforeSent,
    follow_up_dismissed: row.followUpDismissed,
    call_back: row.callBack ?? "",
    call_back_due_date: row.callBackDueDate,
    call_back_completed_at: row.callBackCompletedAt,
    receipt_sent: row.receiptSent,
    no_show_sent: row.noShowSent,
    feedback_sent: row.feedbackSent,
    createdAt: row.createdAt.getTime(),
    createdBy: row.createdBy,
  };
}

export async function getAppointmentsForDate(clinicId: string, date: string): Promise<Appointment[]> {
  return unstable_cache(
    async () => {
      const rows = await prisma.appointment.findMany({
        where: { clinicId, appointmentDate: date },
        orderBy: { appointmentTime: "asc" },
      });
      return rows.map(toAppointment);
    },
    ["appointments-for-date", clinicId, date],
    { revalidate: 20, tags: [appointmentsTag(clinicId)] }
  )();
}

export async function getAppointment(clinicId: string, id: string): Promise<Appointment | null> {
  if (!UUID_RE.test(id)) return null;
  const row = await prisma.appointment.findUnique({ where: { id } });
  if (!row || row.clinicId !== clinicId) return null;
  return toAppointment(row);
}

export async function createAppointment(
  clinicId: string,
  input: Omit<
    Appointment,
    "id" | "clinicId" | "createdAt" | "token_number" | "shift" | "receipt_sent" | "no_show_sent" | "feedback_sent" | "follow_up_dismissed"
  >,
  opts: { dataConsentAt?: Date } = {}
): Promise<string> {
  const row = await prisma.appointment.create({
    data: {
      clinicId,
      appointmentDate: input.appointment_date,
      appointmentTime: input.appointment_time,
      status: input.status,
      entrySource: input.entry_source,
      tokenNumber: 0,
      shift: "morning",
      patientId: input.patientId,
      patientName: input.patient_name,
      patientPhone: input.patient_phone,
      patientAddress: input.patient_address,
      age: input.age === "" ? null : input.age,
      ageUnit: input.age_unit,
      gender: input.gender === "" ? null : input.gender,
      payment: input.payment === "" ? null : input.payment,
      paymentType: input.payment_type === "" ? null : input.payment_type,
      reference: input.reference,
      diagnosis: input.diagnosis,
      followUp: input.follow_up === "" ? null : input.follow_up,
      followUpSent: input.follow_up_sent,
      followUpDayBeforeSent: input.follow_up_day_before_sent,
      callBack: input.call_back === "" ? null : input.call_back,
      callBackDueDate: input.call_back_due_date,
      callBackCompletedAt: input.call_back_completed_at,
      receiptSent: false,
      noShowSent: false,
      feedbackSent: false,
      createdBy: input.createdBy,
      dataConsentAt: opts.dataConsentAt ?? null,
    },
  });
  revalidateTag(appointmentsTag(clinicId));
  return row.id;
}

// Maps every partial-patch field name (app shape, snake_case) to how it's
// written into Prisma's update input (camelCase, with the null<->""
// translation applied only to keys actually present in the patch — a
// partial update must never silently touch fields the caller didn't ask
// to change).
function toPrismaUpdateData(patch: Partial<Appointment>): Prisma.AppointmentUncheckedUpdateInput {
  const data: Prisma.AppointmentUncheckedUpdateInput = {};
  if ("appointment_date" in patch) data.appointmentDate = patch.appointment_date;
  if ("appointment_time" in patch) data.appointmentTime = patch.appointment_time;
  if ("status" in patch) data.status = patch.status;
  if ("entry_source" in patch) data.entrySource = patch.entry_source;
  if ("token_number" in patch) data.tokenNumber = patch.token_number;
  if ("shift" in patch) data.shift = patch.shift;
  if ("patientId" in patch) data.patientId = patch.patientId;
  if ("patient_name" in patch) data.patientName = patch.patient_name;
  if ("patient_phone" in patch) data.patientPhone = patch.patient_phone;
  if ("patient_address" in patch) data.patientAddress = patch.patient_address;
  if ("age" in patch) data.age = patch.age === "" ? null : patch.age;
  if ("age_unit" in patch) data.ageUnit = patch.age_unit;
  if ("gender" in patch) data.gender = patch.gender === "" ? null : patch.gender;
  if ("payment" in patch) data.payment = patch.payment === "" ? null : patch.payment;
  if ("payment_type" in patch) data.paymentType = patch.payment_type === "" ? null : patch.payment_type;
  if ("reference" in patch) data.reference = patch.reference;
  if ("diagnosis" in patch) data.diagnosis = patch.diagnosis;
  if ("follow_up" in patch) data.followUp = patch.follow_up === "" ? null : patch.follow_up;
  if ("follow_up_sent" in patch) data.followUpSent = patch.follow_up_sent;
  if ("follow_up_day_before_sent" in patch) data.followUpDayBeforeSent = patch.follow_up_day_before_sent;
  if ("follow_up_dismissed" in patch) data.followUpDismissed = patch.follow_up_dismissed;
  if ("call_back" in patch) data.callBack = patch.call_back === "" ? null : patch.call_back;
  if ("call_back_due_date" in patch) data.callBackDueDate = patch.call_back_due_date;
  if ("call_back_completed_at" in patch) data.callBackCompletedAt = patch.call_back_completed_at;
  if ("receipt_sent" in patch) data.receiptSent = patch.receipt_sent;
  if ("no_show_sent" in patch) data.noShowSent = patch.no_show_sent;
  if ("feedback_sent" in patch) data.feedbackSent = patch.feedback_sent;
  if ("createdBy" in patch) data.createdBy = patch.createdBy;
  return data;
}

export async function updateAppointment(clinicId: string, id: string, patch: Partial<Appointment>): Promise<void> {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing || existing.clinicId !== clinicId) throw new Error("Appointment not found");

  // updateMany/deleteMany so the clinic scope is part of the write itself,
  // not only of the check above it.
  await prisma.appointment.updateMany({ where: { id, clinicId }, data: toPrismaUpdateData(patch) });
  revalidateTag(appointmentsTag(clinicId));
}

export async function deleteAppointment(clinicId: string, id: string): Promise<void> {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing || existing.clinicId !== clinicId) throw new Error("Appointment not found");

  await prisma.appointment.deleteMany({ where: { id, clinicId } });
  revalidateTag(appointmentsTag(clinicId));
}

export async function findAppointmentsByPhone(clinicId: string, phone: string, max = 20): Promise<Appointment[]> {
  const rows = await prisma.appointment.findMany({
    where: { clinicId, patientPhone: phone },
    orderBy: { createdAt: "desc" },
    take: max,
  });
  return rows.map(toAppointment);
}

export async function getAppointmentsByPatientId(clinicId: string, patientId: string): Promise<Appointment[]> {
  const rows = await prisma.appointment.findMany({
    where: { clinicId, patientId },
    orderBy: [{ appointmentDate: "desc" }, { appointmentTime: "desc" }],
  });
  return rows.map(toAppointment);
}

export async function getCallbacksDueToday(clinicId: string, today: string): Promise<Appointment[]> {
  const rows = await prisma.appointment.findMany({ where: { clinicId, callBackDueDate: today } });
  return rows.map(toAppointment);
}

export async function getAppointmentsInRange(
  clinicId: string,
  fromDate: string,
  toDate: string
): Promise<Appointment[]> {
  return unstable_cache(
    async () => {
      const rows = await prisma.appointment.findMany({
        where: { clinicId, appointmentDate: { gte: fromDate, lte: toDate } },
      });
      return rows.map(toAppointment);
    },
    ["appointments-in-range", clinicId, fromDate, toDate],
    { revalidate: 60, tags: [appointmentsTag(clinicId)] }
  )();
}

export function isLockedForReception(status: AppointmentStatus): boolean {
  return status === "Visited";
}
