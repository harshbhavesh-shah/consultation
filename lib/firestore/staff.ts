import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import type { Staff } from "@/types";

// Read on every dashboard page load. Tag is invalidated in
// app/dashboard/settings/actions.ts on staff add/remove.
export async function listClinicStaff(clinicId: string): Promise<Staff[]> {
  return unstable_cache(
    async () => {
      const snap = await adminDb().collection("staff").where("clinicId", "==", clinicId).get();
      return snap.docs.map((doc) => doc.data() as Staff);
    },
    ["clinic-staff", clinicId],
    { revalidate: 120, tags: [`staff-${clinicId}`] }
  )();
}
