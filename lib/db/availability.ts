import "server-only";
import { prisma } from "./client";
import type { AvailabilityOverride as PrismaOverride } from "@prisma/client";
import type { AvailabilityOverride } from "@/types";

// Was doc id `${clinicId}_${date}` in Firestore — the @@unique([clinicId,
// date]) constraint replaces that encoding; updatedAt is a native
// timestamp here (was epoch-ms), same translation-boundary pattern as
// everywhere else.
function toOverride(row: PrismaOverride): AvailabilityOverride {
  return {
    clinicId: row.clinicId,
    date: row.date,
    unavailable: row.unavailable,
    morning_start: row.morningStart,
    morning_end: row.morningEnd,
    evening_start: row.eveningStart,
    evening_end: row.eveningEnd,
    updatedAt: row.updatedAt.getTime(),
    updatedBy: row.updatedBy,
  };
}

// Read on every public booking page load/date-change and every booking
// submission — not cached, since a doctor closing a date needs to take
// effect immediately, and this is a single-row lookup, not a scan.
export async function getAvailabilityOverride(clinicId: string, date: string): Promise<AvailabilityOverride | null> {
  const row = await prisma.availabilityOverride.findUnique({ where: { clinicId_date: { clinicId, date } } });
  return row ? toOverride(row) : null;
}

/** For the admin calendar UI: every override from today onward. This
 * table only ever holds sparse, manually-created rows (closures/custom
 * hours), so an unfiltered read stays small regardless of how long the
 * clinic has used this. */
export async function listUpcomingOverrides(clinicId: string, todayStr: string): Promise<AvailabilityOverride[]> {
  const rows = await prisma.availabilityOverride.findMany({
    where: { clinicId, date: { gte: todayStr } },
    orderBy: { date: "asc" },
  });
  return rows.map(toOverride);
}

export interface AvailabilityOverrideInput {
  unavailable: boolean;
  morning_start: string;
  morning_end: string;
  evening_start: string;
  evening_end: string;
}

export async function setAvailabilityOverride(
  clinicId: string,
  date: string,
  input: AvailabilityOverrideInput,
  updatedBy: string
): Promise<void> {
  const data = {
    unavailable: input.unavailable,
    morningStart: input.morning_start,
    morningEnd: input.morning_end,
    eveningStart: input.evening_start,
    eveningEnd: input.evening_end,
    updatedBy,
  };
  await prisma.availabilityOverride.upsert({
    where: { clinicId_date: { clinicId, date } },
    create: { clinicId, date, ...data },
    update: data,
  });
}

/** Removes the override — the date reverts to default hours. */
export async function deleteAvailabilityOverride(clinicId: string, date: string): Promise<void> {
  await prisma.availabilityOverride.deleteMany({ where: { clinicId, date } });
}
