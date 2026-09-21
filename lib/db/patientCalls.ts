import "server-only";
import { prisma } from "./client";

// How long an unacknowledged call keeps popping up for reception who load
// the page after it was made. Older ones are assumed stale (the patient has
// long since been sent in, or the doctor moved on).
const PENDING_WINDOW_MS = 15 * 60 * 1000;
// A second press within this window is treated as a double-click.
const DEBOUNCE_MS = 5 * 1000;

export interface PatientCallRow {
  id: string;
  patientName: string;
  tokenNumber: number;
  calledByName: string;
  createdAt: number;
}

function toRow(r: {
  id: string;
  patientName: string;
  tokenNumber: number;
  calledByName: string;
  createdAt: Date;
}): PatientCallRow {
  return {
    id: r.id,
    patientName: r.patientName,
    tokenNumber: r.tokenNumber,
    calledByName: r.calledByName,
    createdAt: r.createdAt.getTime(),
  };
}

export async function createPatientCall(input: {
  clinicId: string;
  appointmentId: string;
  patientName: string;
  tokenNumber: number;
  calledBy: string;
  calledByName: string;
}): Promise<{ id: string; deduped: boolean }> {
  const recent = await prisma.patientCall.findFirst({
    where: {
      clinicId: input.clinicId,
      appointmentId: input.appointmentId,
      createdAt: { gte: new Date(Date.now() - DEBOUNCE_MS) },
    },
    select: { id: true },
  });
  if (recent) return { id: recent.id, deduped: true };

  const row = await prisma.patientCall.create({ data: input });
  return { id: row.id, deduped: false };
}

export async function getPendingCalls(clinicId: string): Promise<PatientCallRow[]> {
  const rows = await prisma.patientCall.findMany({
    where: { clinicId, acknowledgedAt: null, createdAt: { gte: new Date(Date.now() - PENDING_WINDOW_MS) } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toRow);
}

/** Marks a call acknowledged. Scoped by clinic in the write itself; a no-op
 * for an unknown id or another clinic's call. */
export async function acknowledgePatientCall(clinicId: string, id: string, staffUid: string): Promise<void> {
  await prisma.patientCall.updateMany({
    where: { id, clinicId, acknowledgedAt: null },
    data: { acknowledgedAt: new Date(), acknowledgedBy: staffUid },
  });
}

/** Daily housekeeping (called from the cron): calls are only useful for
 * minutes, so don't keep patient names around for longer than needed. */
export async function purgeOldPatientCalls(olderThanDays = 2): Promise<number> {
  const { count } = await prisma.patientCall.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000) } },
  });
  return count;
}
