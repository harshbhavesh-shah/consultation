import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { Clinic } from "@/types";

export async function getClinic(clinicId: string): Promise<Clinic | null> {
  const doc = await adminDb().collection("clinics").doc(clinicId).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return { id: doc.id, name: data.name, createdAt: data.createdAt };
}
