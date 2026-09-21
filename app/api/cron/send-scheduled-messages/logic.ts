import { getAppointmentsInRange, updateAppointment, getNoShowAppointments } from "@/lib/db/appointments";
import { listEnabledFollowUpsWithSince, hasFollowUpBeenSent, logFollowUpSent, getOrCreateSurvey, markSurveySent, deleteUnsentSurvey } from "@/lib/db/retention";
import { computeFollowUpDueDate } from "@/lib/followups";
import { clinicDate, clinicEpoch } from "@/lib/clinicTime";
import { formatTo12Hour } from "@/lib/slots";
import { isValidPhone } from "@/lib/phone";
import { sendAutomatedTemplate } from "@/lib/whatsapp/automatedSends";

// The per-clinic jobs behind app/api/cron/send-scheduled-messages' GET, kept
// out of route.ts because a Next.js route file may only export handlers.
// All dates are CLINIC-local (lib/clinicTime.ts), never the server's UTC
// day, and the caller only runs these inside the 9am-8pm send window.

// Bounds the appointments scanned per clinic to a rolling window, wide
// enough to cover any realistic follow-up offset while staying an indexed read.
const LOOKBACK_DAYS = 120;
// Follow-ups only apply to fairly recent misses.
const NO_SHOW_LOOKBACK_DAYS = 21;

/** Follow-up reminder — the day before and on the day, each sent once. */
export async function processFollowUpReminders(clinicId: string, clinicName: string, now: Date): Promise<number> {
  const today = clinicDate(0, now);
  const tomorrow = clinicDate(1, now);
  const appointments = await getAppointmentsInRange(clinicId, clinicDate(-LOOKBACK_DAYS, now), tomorrow);

  let sent = 0;
  for (const a of appointments) {
    if (a.follow_up === "" || a.follow_up_dismissed || a.status === "Cancelled" || a.status === "NoShow") continue;
    const dueDate = computeFollowUpDueDate(a.appointment_date, a.follow_up);
    const isDueTomorrow = dueDate === tomorrow && !a.follow_up_day_before_sent;
    const isDueToday = dueDate === today && !a.follow_up_sent;
    if (!isDueTomorrow && !isDueToday) continue;

    const result = await sendAutomatedTemplate({
      clinicId,
      category: "appointment_reminder",
      toPhone: a.patient_phone,
      params: [a.patient_name, clinicName, dueDate!, formatTo12Hour(a.appointment_time)],
      patientId: a.patientId,
      patientName: a.patient_name,
    });
    if (result.sent) {
      await updateAppointment(clinicId, a.id, {
        ...(isDueTomorrow ? { follow_up_day_before_sent: true } : {}),
        ...(isDueToday ? { follow_up_sent: true } : {}),
      });
      sent++;
    }
  }
  return sent;
}

/** Feedback request — marked Visited the day before. */
export async function processFeedbackRequests(clinicId: string, now: Date): Promise<number> {
  const yesterday = clinicDate(-1, now);
  const appointments = await getAppointmentsInRange(clinicId, yesterday, yesterday);

  let sent = 0;
  for (const a of appointments) {
    if (a.appointment_date !== yesterday || a.status !== "Visited" || a.feedback_sent) continue;
    const result = await sendAutomatedTemplate({
      clinicId,
      category: "visit_feedback",
      toPhone: a.patient_phone,
      params: [a.patient_name, ""],
      patientId: a.patientId,
      patientName: a.patient_name,
    });
    if (result.sent) {
      await updateAppointment(clinicId, a.id, { feedback_sent: true });
      sent++;
    }
  }
  return sent;
}

/**
 * The clinic's configured no-show follow-ups. Each fires `delayHours` after
 * the appointment's own scheduled time, once the appointment is flagged a
 * no-show, and only for appointments scheduled after the follow-up was
 * switched on. The (appointment, follow-up) log guarantees each goes out once.
 */
export async function processNoShowFollowUps(clinicId: string, baseUrl: string, now: Date): Promise<number> {
  const followUps = await listEnabledFollowUpsWithSince(clinicId);
  if (followUps.length === 0) return 0;

  const noShows = await getNoShowAppointments(clinicId, clinicDate(-NO_SHOW_LOOKBACK_DAYS, now));
  const nowMs = now.getTime();

  let sent = 0;
  for (const followUp of followUps) {
    for (const appt of noShows) {
      const startMs = clinicEpoch(appt.appointment_date, appt.appointment_time);
      if (startMs < followUp.enabledSince) continue; // never message a backlog
      if (nowMs - startMs < followUp.delayHours * 60 * 60 * 1000) continue;
      if (!isValidPhone(appt.patient_phone)) continue;
      if (await hasFollowUpBeenSent(appt.id, followUp.id)) continue;

      let secondVar = followUp.offerText ?? "";
      let surveyId: string | null = null;
      try {
        if (followUp.kind === "survey") {
          const survey = await getOrCreateSurvey(clinicId, appt.id);
          surveyId = survey.id;
          secondVar = `${baseUrl}/no-show-survey/${survey.token}`;
        }

        const result = await sendAutomatedTemplate({
          clinicId,
          category: "no_show_followup",
          templateId: followUp.templateId,
          toPhone: appt.patient_phone,
          params: [appt.patient_name, secondVar],
          patientId: appt.patientId,
          patientName: appt.patient_name,
        });
        if (!result.sent) {
          // Not connected, opted out, or Meta rejected it — retried next poll
          // (or never, for an opt-out). Don't leave an orphan survey row.
          if (surveyId) await deleteUnsentSurvey(surveyId).catch(() => {});
          continue;
        }
        if (surveyId) await markSurveySent(surveyId);
        await logFollowUpSent({ clinicId, appointmentId: appt.id, followUpId: followUp.id, followUpName: followUp.name });
        sent++;
      } catch (err) {
        console.error(`No-show follow-up failed for clinic ${clinicId}:`, err instanceof Error ? err.message : err);
        if (surveyId) await deleteUnsentSurvey(surveyId).catch(() => {});
      }
    }
  }
  return sent;
}
