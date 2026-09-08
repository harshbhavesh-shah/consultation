import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import type { AttendanceEntry } from "@/types";

function attendanceTag(clinicId: string): string {
  return `attendance-${clinicId}`;
}

function toEntry(doc: FirebaseFirestore.QueryDocumentSnapshot): AttendanceEntry {
  const data = doc.data();
  return {
    id: doc.id,
    clinicId: data.clinicId,
    staffUid: data.staffUid,
    staffName: data.staffName,
    date: data.date,
    clockIn: data.clockIn,
  };
}

export async function getTodaysEntryForStaff(
  clinicId: string,
  staffUid: string,
  date: string
): Promise<AttendanceEntry | null> {
  const snap = await adminDb()
    .collection("attendance")
    .where("clinicId", "==", clinicId)
    .where("staffUid", "==", staffUid)
    .where("date", "==", date)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toEntry(snap.docs[0]);
}

export async function clockIn(
  clinicId: string,
  staffUid: string,
  staffName: string,
  date: string
): Promise<string> {
  const ref = adminDb().collection("attendance").doc();
  await ref.set({ clinicId, staffUid, staffName, date, clockIn: Date.now() });
  revalidateTag(attendanceTag(clinicId));
  return ref.id;
}

// Read by the doctor's dashboard on every load to show reception
// check-in status — cached and tag-invalidated on clockIn() so it doesn't
// re-scan on every single dashboard render.
export async function getAttendanceForDate(clinicId: string, date: string): Promise<AttendanceEntry[]> {
  return unstable_cache(
    async () => {
      const snap = await adminDb()
        .collection("attendance")
        .where("clinicId", "==", clinicId)
        .where("date", "==", date)
        .get();
      return snap.docs.map(toEntry).sort((a, b) => a.clockIn - b.clockIn);
    },
    ["attendance-for-date", clinicId, date],
    { revalidate: 30, tags: [attendanceTag(clinicId)] }
  )();
}
