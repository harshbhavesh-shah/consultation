import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "./client";
import type { AttendanceEntry as PrismaAttendanceEntry } from "@prisma/client";
import type { AttendanceEntry } from "@/types";

function attendanceTag(clinicId: string): string {
  return `attendance-${clinicId}`;
}

// clockIn is a native timestamp in Postgres (was epoch-ms in Firestore) —
// the usual translation-boundary conversion via .getTime().
function toEntry(row: PrismaAttendanceEntry): AttendanceEntry {
  return {
    id: row.id,
    clinicId: row.clinicId,
    staffUid: row.staffUid,
    staffName: row.staffName,
    date: row.date,
    clockIn: row.clockIn.getTime(),
  };
}

export async function getTodaysEntryForStaff(
  clinicId: string,
  staffUid: string,
  date: string
): Promise<AttendanceEntry | null> {
  const row = await prisma.attendanceEntry.findFirst({ where: { clinicId, staffUid, date } });
  return row ? toEntry(row) : null;
}

/** Throws on a P2002 unique-constraint violation ([staffUid, date]) if
 * called twice for the same staff member on the same day — a real,
 * database-enforced version of the "one entry per staff per day" rule the
 * comment above always described, but Firestore never actually enforced
 * (callers already check getTodaysEntryForStaff first, so this only ever
 * fires on a genuine race between two near-simultaneous clock-ins). */
export async function clockIn(clinicId: string, staffUid: string, staffName: string, date: string): Promise<string> {
  const row = await prisma.attendanceEntry.create({
    data: { clinicId, staffUid, staffName, date, clockIn: new Date() },
  });
  revalidateTag(attendanceTag(clinicId));
  return row.id;
}

// Read by the doctor's dashboard on every load to show reception
// check-in status — cached and tag-invalidated on clockIn() so it doesn't
// re-scan on every single dashboard render.
export async function getAttendanceForDate(clinicId: string, date: string): Promise<AttendanceEntry[]> {
  return unstable_cache(
    async () => {
      const rows = await prisma.attendanceEntry.findMany({
        where: { clinicId, date },
        orderBy: { clockIn: "asc" },
      });
      return rows.map(toEntry);
    },
    ["attendance-for-date", clinicId, date],
    { revalidate: 30, tags: [attendanceTag(clinicId)] }
  )();
}
