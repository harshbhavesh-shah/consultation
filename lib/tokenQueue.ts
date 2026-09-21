import "server-only";
import { revalidateTag } from "next/cache";
import { prisma } from "@/lib/db/client";
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
  const rows = await prisma.appointment.findMany({
    where: { clinicId, appointmentDate },
    select: {
      id: true,
      appointmentTime: true,
      status: true,
      entrySource: true,
      patientName: true,
      createdAt: true,
    },
  });

  const entries: QueueEntry[] = [];
  for (const row of rows) {
    if (row.status === "Cancelled" || row.status === "NoShow") continue; // not a queue slot
    if (!row.appointmentTime) continue;

    entries.push({
      id: row.id,
      appointment_time: row.appointmentTime,
      status: row.status,
      entry_source: row.entrySource,
      patient_name: row.patientName,
      createdAt: row.createdAt.getTime(),
      shift: shiftForTime(row.appointmentTime),
      token_number: 0,
    });
  }

  entries.sort((a, b) => {
    if (a.appointment_time !== b.appointment_time) {
      return a.appointment_time < b.appointment_time ? -1 : 1;
    }
    return a.createdAt - b.createdAt;
  });

  const shiftCounters: Record<Shift, number> = { morning: 0, afternoon: 0 };
  const writes = entries.map((entry) => {
    shiftCounters[entry.shift] += 1;
    entry.token_number = shiftCounters[entry.shift];
    // Shift can also change (e.g. rescheduled across the boundary), so
    // always write shift alongside token_number rather than only on a
    // token_number diff.
    return prisma.appointment.update({
      where: { id: entry.id },
      data: { tokenNumber: entry.token_number, shift: entry.shift },
    });
  });

  if (writes.length > 0) {
    await prisma.$transaction(writes);
    // Bypasses lib/db/appointments.ts's create/update/delete wrappers
    // (it's a direct batch write), so it has to invalidate the cached
    // appointments-for-date/range reads itself.
    revalidateTag(`appointments-${clinicId}`);
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
