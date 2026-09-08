import "server-only";
import { unstable_cache } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import type { Clinic } from "@/types";

// Fetched on every /dashboard page load (see app/dashboard/layout.tsx) but
// the clinic doc is effectively immutable after signup — no update path
// exists — so a long revalidate window is safe with no cache-tag wiring.
export async function getClinic(clinicId: string): Promise<Clinic | null> {
  return unstable_cache(
    async () => {
      const doc = await adminDb().collection("clinics").doc(clinicId).get();
      if (!doc.exists) return null;
      const data = doc.data()!;
      return { id: doc.id, name: data.name, createdAt: data.createdAt };
    },
    ["clinic", clinicId],
    { revalidate: 300 }
  )();
}
