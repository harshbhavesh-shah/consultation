import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { AttendanceEntry } from "@/types";

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
  return ref.id;
}

export async function getAttendanceForDate(clinicId: string, date: string): Promise<AttendanceEntry[]> {
  const snap = await adminDb()
    .collection("attendance")
    .where("clinicId", "==", clinicId)
    .where("date", "==", date)
    .get();
  return snap.docs.map(toEntry).sort((a, b) => a.clockIn - b.clockIn);
}
