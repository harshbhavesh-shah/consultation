import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { Staff } from "@/types";

export async function listClinicStaff(clinicId: string): Promise<Staff[]> {
  const snap = await adminDb().collection("staff").where("clinicId", "==", clinicId).get();
  return snap.docs.map((doc) => doc.data() as Staff);
}
