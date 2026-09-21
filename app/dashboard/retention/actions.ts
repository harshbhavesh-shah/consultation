"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getAppointment, updateAppointment } from "@/lib/db/appointments";
import { reassignDailyTokens } from "@/lib/tokenQueue";
import { recordAuditEvent } from "@/lib/db/auditLog";
import {
  createNoShowFollowUp,
  updateNoShowFollowUp,
  deleteNoShowFollowUp,
  type NoShowFollowUpInput,
} from "@/lib/db/retention";
import { computeFollowUpDueDate } from "@/lib/followups";
import { formatTo12Hour } from "@/lib/slots";
import { sendAutomatedTemplate } from "@/lib/whatsapp/automatedSends";
import { getClinic } from "@/lib/db/clinics";
import type { NoShowFollowUp, NoShowFollowUpKind } from "@/types";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

async function requireDoctor() {
  const session = await requireSession();
  if (session.role !== "doctor") throw new Error("Only a doctor can change follow-up settings.");
  return session;
}

const KINDS: NoShowFollowUpKind[] = ["survey", "incentive", "reminder", "custom"];

function validate(input: NoShowFollowUpInput): { error: string } | { value: NoShowFollowUpInput } {
  const name = input.name.trim();
  if (!name) return { error: "Give the follow-up a name." };
  if (name.length > 60) return { error: "Keep the name under 60 characters." };
  if (!KINDS.includes(input.kind)) return { error: "Choose what kind of follow-up this is." };
  if (!input.templateId) return { error: "Choose a message template." };
  const delay = Math.trunc(Number(input.delayHours));
  if (!Number.isFinite(delay) || delay < 1 || delay > 168) return { error: "Delay must be between 1 and 168 hours." };
  const offerText = input.offerText?.trim() ?? "";
  if (offerText.length > 200) return { error: "Keep the offer under 200 characters." };
  const usesText = input.kind === "incentive" || input.kind === "custom";
  return {
    value: { name, kind: input.kind, templateId: input.templateId, offerText: usesText && offerText ? offerText : undefined, enabled: !!input.enabled, delayHours: delay },
  };
}

export async function createFollowUpAction(
  input: NoShowFollowUpInput
): Promise<{ error: string } | { followUp: NoShowFollowUp }> {
  const session = await requireDoctor();
  const checked = validate(input);
  if ("error" in checked) return checked;
  try {
    const followUp = await createNoShowFollowUp(session.clinicId, checked.value);
    await recordAuditEvent(session, { action: "noshow_followup.create", targetType: "NoShowFollowUp", targetId: followUp.id });
    revalidatePath("/dashboard/retention");
    return { followUp };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save the follow-up." };
  }
}

export async function updateFollowUpAction(
  id: string,
  input: NoShowFollowUpInput
): Promise<{ error: string } | { followUp: NoShowFollowUp }> {
  const session = await requireDoctor();
  const checked = validate(input);
  if ("error" in checked) return checked;
  try {
    const followUp = await updateNoShowFollowUp(session.clinicId, id, checked.value);
    await recordAuditEvent(session, {
      action: "noshow_followup.update",
      targetType: "NoShowFollowUp",
      targetId: id,
      metadata: { enabled: followUp.enabled },
    });
    revalidatePath("/dashboard/retention");
    return { followUp };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't save the follow-up." };
  }
}

export async function deleteFollowUpAction(id: string): Promise<{ error?: string }> {
  const session = await requireDoctor();
  try {
    await deleteNoShowFollowUp(session.clinicId, id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't delete the follow-up." };
  }
  await recordAuditEvent(session, { action: "noshow_followup.delete", targetType: "NoShowFollowUp", targetId: id });
  revalidatePath("/dashboard/retention");
  return {};
}

/** Staff flag a "Booked" appointment as a no-show by hand (same day, before
 * the next-morning detection would). */
export async function markNoShowAction(appointmentId: string): Promise<{ error?: string }> {
  const session = await requireSession();
  const appointment = await getAppointment(session.clinicId, appointmentId);
  if (!appointment) return { error: "Appointment not found." };
  if (appointment.status !== "Booked") return { error: "Only a booked appointment can be marked as a no-show." };

  await updateAppointment(session.clinicId, appointmentId, { status: "NoShow" });
  await reassignDailyTokens(session.clinicId, appointment.appointment_date);
  await recordAuditEvent(session, { action: "appointment.mark_no_show", targetType: "Appointment", targetId: appointmentId });
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/retention");
  return {};
}

/** A no-show that actually attended (the flag was wrong, or they turned up
 * late). Becomes a completed visit — restoring it to "Booked" would just be
 * re-flagged by the next detection run. */
export async function markAttendedAction(appointmentId: string): Promise<{ error?: string }> {
  const session = await requireSession();
  const appointment = await getAppointment(session.clinicId, appointmentId);
  if (!appointment) return { error: "Appointment not found." };
  if (appointment.status !== "NoShow") return { error: "This appointment isn't marked as a no-show." };

  await updateAppointment(session.clinicId, appointmentId, { status: "Visited" });
  await reassignDailyTokens(session.clinicId, appointment.appointment_date);
  await recordAuditEvent(session, { action: "appointment.no_show_reverted", targetType: "Appointment", targetId: appointmentId });
  revalidatePath("/dashboard/appointments");
  revalidatePath("/dashboard/retention");
  return {};
}

const SEND_FAILURE_MESSAGES: Record<string, string> = {
  "not-connected": "WhatsApp isn't connected yet — connect it under Communication.",
  "opted-out": "This patient has opted out of WhatsApp messages.",
};

/** Send the follow-up reminder to a patient right now instead of waiting
 * for the scheduled one. Marks both scheduled sends as done so it isn't
 * sent again. */
export async function sendFollowUpNowAction(appointmentId: string): Promise<{ error?: string }> {
  const session = await requireSession();
  const appointment = await getAppointment(session.clinicId, appointmentId);
  if (!appointment || appointment.follow_up === "") return { error: "Follow-up not found." };

  const dueDate = computeFollowUpDueDate(appointment.appointment_date, appointment.follow_up);
  const clinic = await getClinic(session.clinicId);
  const result = await sendAutomatedTemplate({
    clinicId: session.clinicId,
    category: "appointment_reminder",
    toPhone: appointment.patient_phone,
    params: [appointment.patient_name, clinic?.name ?? "the clinic", dueDate ?? "", formatTo12Hour(appointment.appointment_time)],
    patientId: appointment.patientId,
    patientName: appointment.patient_name,
  });
  if (!result.sent) {
    const reason = result.reason ?? "";
    if (reason.startsWith("no-template")) return { error: "Add an appointment reminder template under Communication first." };
    return { error: SEND_FAILURE_MESSAGES[reason] ?? "Couldn't send the message. Please try again." };
  }

  await updateAppointment(session.clinicId, appointmentId, { follow_up_sent: true, follow_up_day_before_sent: true });
  await recordAuditEvent(session, { action: "followup.send_now", targetType: "Appointment", targetId: appointmentId });
  revalidatePath("/dashboard/retention");
  return {};
}

/** Clear a follow-up from the list ("done or skipped"): suppresses the
 * automatic reminder too. The recorded follow-up days are kept. */
export async function dismissFollowUpAction(appointmentId: string): Promise<{ error?: string }> {
  const session = await requireSession();
  const appointment = await getAppointment(session.clinicId, appointmentId);
  if (!appointment) return { error: "Appointment not found." };

  await updateAppointment(session.clinicId, appointmentId, { follow_up_dismissed: true });
  await recordAuditEvent(session, { action: "followup.dismiss", targetType: "Appointment", targetId: appointmentId });
  revalidatePath("/dashboard/retention");
  return {};
}
