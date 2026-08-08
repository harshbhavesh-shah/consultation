"use server";

import { adminDb } from "@/lib/firebase/admin";
import { getAppointmentsForDate, createAppointment } from "@/lib/firestore/appointments";
import { reassignDailyTokens, countStillWaitingAhead } from "@/lib/tokenQueue";
import { isBookableDate } from "@/lib/slots";

export interface BookingResult {
  error?: string;
  token?: number;
  ahead?: number;
}

export async function createPublicBookingAction(
  clinicId: string,
  input: { name: string; phone: string; date: string; time: string }
): Promise<BookingResult> {
  const name = input.name.trim();
  const phone = input.phone.trim();

  if (!name || !phone || !input.date || !input.time) {
    return { error: "Please fill in all fields." };
  }
  if (!isBookableDate(input.date)) {
    return { error: "That date isn't available for booking." };
  }

  const clinicDoc = await adminDb().collection("clinics").doc(clinicId).get();
  if (!clinicDoc.exists) {
    return { error: "Clinic not found." };
  }

  // Re-check the slot is still open server-side — the client's live
  // availability view can be stale by the time of submit.
  const existing = await getAppointmentsForDate(clinicId, input.date);
  const taken = existing.some((a) => a.status !== "Cancelled" && a.appointment_time === input.time);
  if (taken) {
    return { error: "That time slot was just booked by someone else. Please pick another." };
  }

  const id = await createAppointment(clinicId, {
    appointment_date: input.date,
    appointment_time: input.time,
    status: "Booked",
    entry_source: "online",
    patientId: null,
    patient_name: name,
    patient_phone: phone,
    patient_address: "",
    age: "",
    age_unit: "years",
    gender: "",
    payment: "",
    payment_type: "",
    reference: "",
    diagnosis: "",
    follow_up: "",
    follow_up_sent: false,
    follow_up_day_before_sent: false,
    call_back: "",
    call_back_due_date: null,
    call_back_completed_at: null,
    createdBy: "online-booking",
  });

  const entries = await reassignDailyTokens(clinicId, input.date);
  const ahead = countStillWaitingAhead(entries, id);
  const mine = entries.find((e) => e.id === id);

  return { token: mine?.token_number ?? 0, ahead };
}
