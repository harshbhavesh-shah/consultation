"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { searchPatients } from "@/lib/firestore/patients";
import { getCallbacksDueToday, updateAppointment, getAppointment } from "@/lib/firestore/appointments";
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
