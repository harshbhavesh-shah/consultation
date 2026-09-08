import { NextResponse } from "next/server";
import { listConnectedClinicIds } from "@/lib/firestore/whatsappConnections";
import { getClinic } from "@/lib/firestore/clinics";
import { getAppointmentsInRange, updateAppointment } from "@/lib/firestore/appointments";
import { computeFollowUpDueDate } from "@/lib/followups";
import { formatTo12Hour } from "@/lib/slots";
import { sendAutomatedTemplate } from "@/lib/whatsapp/automatedSends";

// Runs once a day (see vercel.json) across every WhatsApp-connected clinic.
// Vercel Cron automatically sends `Authorization: Bearer ${CRON_SECRET}`
// when that env var is set on the project — same secret-header pattern as
// app/api/admin/reassign-tokens, just via the header Vercel itself adds.
// On another host, point an external scheduler at this URL with the same
// header once a day instead.
//
// Three independent automated sends, each guarded by its own boolean flag
// on the appointment so it fires at most once:
//  - Follow-up reminder (day before + on the day): derived from the
//    `follow_up` (days) field — see computeFollowUpDueDate. This is what
//    follow_up_sent/follow_up_day_before_sent already existed for (see the
//    comment in app/dashboard/appointments/actions.ts).
//  - No-show follow-up: still "Booked" the day after its appointment date
//    (never marked Visited or Cancelled).
//  - Feedback survey: marked "Visited" the day before.
// (Booking confirmations and receipts fire immediately elsewhere — see
// app/book/[clinicId]/actions.ts and app/dashboard/appointments/actions.ts
// — not here.)

function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

// Bounds the appointments scanned per clinic to a rolling window instead of
// the clinic's whole history — wide enough to cover any realistic follow_up
// offset (entered in days on the appointment) while staying a bounded,
// indexed read (see getAppointmentsInRange).
const LOOKBACK_DAYS = 120;

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const today = todayStr(0);
  const tomorrow = todayStr(1);
  const yesterday = todayStr(-1);
  const windowStart = todayStr(-LOOKBACK_DAYS);

  const clinicIds = await listConnectedClinicIds();
  let reminders = 0;
  let noShows = 0;
  let feedback = 0;

  for (const clinicId of clinicIds) {
    const [clinic, appointments] = await Promise.all([
      getClinic(clinicId),
      getAppointmentsInRange(clinicId, windowStart, tomorrow),
    ]);
    const clinicName = clinic?.name ?? "the clinic";

    for (const appointment of appointments) {
      // Follow-up reminder — day before and on the day, each sent once.
      if (appointment.follow_up !== "") {
        const dueDate = computeFollowUpDueDate(appointment.appointment_date, appointment.follow_up);
        const isDueTomorrow = dueDate === tomorrow && !appointment.follow_up_day_before_sent;
        const isDueToday = dueDate === today && !appointment.follow_up_sent;

        if (isDueTomorrow || isDueToday) {
          const result = await sendAutomatedTemplate({
            clinicId,
            category: "appointment_reminder",
            toPhone: appointment.patient_phone,
            params: [appointment.patient_name, clinicName, dueDate!, formatTo12Hour(appointment.appointment_time)],
            patientId: appointment.patientId,
            patientName: appointment.patient_name,
          });
          if (result.sent) {
            await updateAppointment(clinicId, appointment.id, {
              ...(isDueTomorrow ? { follow_up_day_before_sent: true } : {}),
              ...(isDueToday ? { follow_up_sent: true } : {}),
            });
            reminders++;
          }
        }
      }

      // No-show follow-up — still Booked the day after the appointment.
      if (appointment.appointment_date === yesterday && appointment.status === "Booked" && !appointment.no_show_sent) {
        const result = await sendAutomatedTemplate({
          clinicId,
          category: "no_show_followup",
          toPhone: appointment.patient_phone,
          params: [appointment.patient_name, ""],
          patientId: appointment.patientId,
          patientName: appointment.patient_name,
        });
        if (result.sent) {
          await updateAppointment(clinicId, appointment.id, { no_show_sent: true });
          noShows++;
        }
      }

      // Feedback survey — Visited the day before.
      if (appointment.appointment_date === yesterday && appointment.status === "Visited" && !appointment.feedback_sent) {
        const result = await sendAutomatedTemplate({
          clinicId,
          category: "visit_feedback",
          toPhone: appointment.patient_phone,
          params: [appointment.patient_name, ""],
          patientId: appointment.patientId,
          patientName: appointment.patient_name,
        });
        if (result.sent) {
          await updateAppointment(clinicId, appointment.id, { feedback_sent: true });
          feedback++;
        }
      }
    }
  }

  return NextResponse.json({ clinics: clinicIds.length, reminders, noShows, feedback });
}
