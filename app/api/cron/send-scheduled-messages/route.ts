import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { listConnectedClinicIds } from "@/lib/db/whatsappConnections";
import { getClinic } from "@/lib/db/clinics";
import { detectNoShows } from "@/lib/db/retention";
import { purgeOldPatientCalls } from "@/lib/db/patientCalls";
import { clinicNow, isInSendWindow } from "@/lib/clinicTime";
import { processFollowUpReminders, processFeedbackRequests, processNoShowFollowUps } from "./logic";

// Polled every 15 minutes by an external scheduler (cron-job.org or
// similar, sending `Authorization: Bearer <CRON_SECRET>`) — Vercel's Hobby
// plan can only cron once a day, and no-show follow-ups are timed in hours.
// The Vercel daily cron in vercel.json stays as a safety net; every job below
// is idempotent, so extra runs are harmless. Setup: docs/retention-setup.md.
//
// Each run:
//   1. Flags past-dated, still-"Booked" appointments as No-show (all
//      clinics, any hour — see detectNoShows for the rule and its guards).
//   2. Housekeeping: drops stale call-in popups.
//   3. ONLY inside the clinic-local 9am-8pm window, for every WhatsApp-
//      connected clinic: follow-up reminders (day before / on the day),
//      feedback requests (day after a visit), and the clinic's configured
//      no-show follow-ups. Patients never get messages at 5 AM; anything due
//      outside the window simply goes out on the first poll inside it.
//
// One clinic's failure never blocks the rest, and a failed send is retried
// on the next poll.

function isAuthorizedCron(authHeader: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authHeader);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const { date: today } = clinicNow(now);

  const noShowsDetected = await detectNoShows(today).catch((err) => {
    console.error("No-show detection failed:", err instanceof Error ? err.message : err);
    return 0;
  });
  await purgeOldPatientCalls().catch((err) => console.error("Failed to purge old patient calls:", err));

  if (!isInSendWindow(now)) {
    return NextResponse.json({ noShowsDetected, messages: "skipped — outside the 9am-8pm send window" });
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/$/, "");
  const clinicIds = await listConnectedClinicIds();
  let reminders = 0;
  let feedback = 0;
  let noShowFollowUps = 0;

  for (const clinicId of clinicIds) {
    try {
      const clinic = await getClinic(clinicId);
      reminders += await processFollowUpReminders(clinicId, clinic?.name ?? "the clinic", now);
      feedback += await processFeedbackRequests(clinicId, now);
      noShowFollowUps += await processNoShowFollowUps(clinicId, baseUrl, now);
    } catch (err) {
      console.error(`Scheduled messages failed for clinic ${clinicId}:`, err instanceof Error ? err.message : err);
    }
  }

  return NextResponse.json({ clinics: clinicIds.length, noShowsDetected, reminders, feedback, noShowFollowUps });
}
