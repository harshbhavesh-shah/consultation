import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import { shiftForTime } from "@/lib/slots";
import type { Shift } from "@/types";

// Shared "definitive queue" logic — both online bookings and walk-in
// check-ins share ONE token sequence per clinic + date, split into
// independent morning/afternoon sequences at the shift boundary (see
// lib/slots.ts SHIFT_BOUNDARY_HOUR). A token isn't just an incrementing
// counter — it always reflects true chronological order by
// appointment_time, so a walk-in checking in for an earlier open slot than
// an already-booked online patient correctly slots in ahead of them, and
// everyone after gets renumbered.
//
// reassignDailyTokens() is the single source of truth: call it after any
// create, reschedule, or delete that touches a given clinic+date, and it
// recomputes token_number for every appointment in that group in one batch.

interface QueueEntry {
  id: string;
  appointment_time: string;
  status: string;
  entry_source: string;
  patient_name: string;
  createdAt: number;
  shift: Shift;
  token_number: number;
}

export async function reassignDailyTokens(clinicId: string, appointmentDate: string): Promise<QueueEntry[]> {
  const snap = await adminDb()
    .collection("appointments")
    .where("clinicId", "==", clinicId)
    .where("appointment_date", "==", appointmentDate)
    .get();

  const entries: (QueueEntry & { prevToken: number })[] = [];
  snap.forEach((doc) => {
    const data = doc.data();
    if (data.status === "Cancelled") return; // not a queue slot
    if (!data.appointment_time) return;

    entries.push({
      id: doc.id,
      appointment_time: data.appointment_time,
      status: data.status || "Booked",
      entry_source: data.entry_source || "online",
      patient_name: data.patient_name || "",
      createdAt: data.createdAt || 0,
      shift: shiftForTime(data.appointment_time),
      prevToken: data.token_number || 0,
      token_number: 0,
    });
  });

  entries.sort((a, b) => {
    if (a.appointment_time !== b.appointment_time) {
      return a.appointment_time < b.appointment_time ? -1 : 1;
    }
    return a.createdAt - b.createdAt;
  });

  const batch = adminDb().batch();
  let pendingWrites = 0;

  const shiftCounters: Record<Shift, number> = { morning: 0, afternoon: 0 };
  entries.forEach((entry) => {
    shiftCounters[entry.shift] += 1;
    entry.token_number = shiftCounters[entry.shift];
    if (entry.prevToken !== entry.token_number || true) {
      // Shift can also change (e.g. rescheduled across the boundary), so
      // always write shift alongside token_number rather than only on a
      // token_number diff.
      batch.update(adminDb().collection("appointments").doc(entry.id), {
        token_number: entry.token_number,
        shift: entry.shift,
      });
      pendingWrites++;
    }
  });

  if (pendingWrites > 0) {
    await batch.commit();
  }

  return entries;
}

/** Same-shift entries before this one that are still waiting (not Visited). */
export function countStillWaitingAhead(entries: QueueEntry[], entryId: string): number {
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx === -1) return 0;
  const mine = entries[idx];
  return entries.slice(0, idx).filter((e) => e.shift === mine.shift && e.status !== "Visited").length;
}
