import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { AvailabilityOverride } from "@/types";

const COLLECTION = "availability";

function docId(clinicId: string, date: string): string {
  return `${clinicId}_${date}`;
}

function toOverride(doc: FirebaseFirestore.DocumentSnapshot): AvailabilityOverride | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    clinicId: data.clinicId,
    date: data.date,
    unavailable: data.unavailable ?? false,
    morning_start: data.morning_start ?? "",
    morning_end: data.morning_end ?? "",
    evening_start: data.evening_start ?? "",
    evening_end: data.evening_end ?? "",
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy ?? "",
  };
}

// Read on every public booking page load/date-change and every booking
// submission — not cached, since a doctor closing a date needs to take
// effect immediately, and this is a single-doc get, not a scan.
export async function getAvailabilityOverride(clinicId: string, date: string): Promise<AvailabilityOverride | null> {
  const doc = await adminDb().collection(COLLECTION).doc(docId(clinicId, date)).get();
  return toOverride(doc);
}

/** For the admin calendar UI: every override from today onward. This
 * collection only ever holds sparse, manually-created rows (closures/custom
 * hours), so an unfiltered-by-date read stays small regardless of how long
 * the clinic has used this — nothing like the appointments/patients scans
 * that caused read-limit trouble earlier. */
export async function listUpcomingOverrides(clinicId: string, todayStr: string): Promise<AvailabilityOverride[]> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .where("clinicId", "==", clinicId)
    .where("date", ">=", todayStr)
    .get();
  return snap.docs.map((d) => toOverride(d)!).sort((a, b) => (a.date < b.date ? -1 : 1));
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
  await adminDb()
    .collection(COLLECTION)
    .doc(docId(clinicId, date))
    .set({ clinicId, date, ...input, updatedAt: Date.now(), updatedBy });
}

/** Removes the override — the date reverts to default hours. */
export async function deleteAvailabilityOverride(clinicId: string, date: string): Promise<void> {
  await adminDb().collection(COLLECTION).doc(docId(clinicId, date)).delete();
}
