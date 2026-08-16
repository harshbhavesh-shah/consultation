import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { Patient, AgeUnit, Gender } from "@/types";

// Excludes ambiguous characters (I/O/0/1) so a patient ID is easy to read
// back over the phone or off a printed slip.
const ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generatePatientCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += ID_ALPHABET[Math.floor(Math.random() * ID_ALPHABET.length)];
  }
  return `PT-${code}`;
}

function toPatient(doc: FirebaseFirestore.QueryDocumentSnapshot): Patient {
  const data = doc.data();
  return {
    id: doc.id,
    clinicId: data.clinicId,
    patient_id: data.patient_id,
    name: data.name,
    phone: data.phone,
    address: data.address ?? "",
    age: data.age ?? "",
    age_unit: (data.age_unit ?? "years") as AgeUnit,
    gender: (data.gender ?? "") as Gender,
    createdAt: data.createdAt,
  };
}

export async function findPatientsByPhone(clinicId: string, phone: string): Promise<Patient[]> {
  const snap = await adminDb()
    .collection("patients")
    .where("clinicId", "==", clinicId)
    .where("phone", "==", phone)
    .get();
  return snap.docs.map(toPatient);
}

export async function getPatientByCode(clinicId: string, patientCode: string): Promise<Patient | null> {
  const snap = await adminDb()
    .collection("patients")
    .where("clinicId", "==", clinicId)
    .where("patient_id", "==", patientCode)
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toPatient(snap.docs[0]);
}

export async function createPatient(
  clinicId: string,
  input: Pick<Patient, "name" | "phone" | "address" | "age" | "age_unit" | "gender">
): Promise<Patient> {
  const patient_id = generatePatientCode();
  const ref = adminDb().collection("patients").doc();
  const createdAt = Date.now();
  await ref.set({ clinicId, patient_id, createdAt, ...input });
  return { id: ref.id, clinicId, patient_id, createdAt, ...input };
}

export async function searchPatients(clinicId: string, term: string): Promise<Patient[]> {
  const needle = term.trim().toLowerCase();
  if (!needle) return listAllPatients(clinicId, 50);
  // Very short terms match almost everything and aren't useful yet — skip
  // the read entirely rather than scanning on every first keystroke.
  if (needle.length < 2) return [];

  // Firestore has no case-insensitive substring index, so this still needs
  // a broad scan — but capped, so a large clinic's history (thousands of
  // patients, e.g. after a historical data import) can't blow through a
  // daily read quota on a single search. Revisit with a real search index
  // (e.g. an indexed lowercased-name prefix field) if this cap starts
  // missing real matches.
  const snap = await adminDb().collection("patients").where("clinicId", "==", clinicId).limit(1000).get();
  const all = snap.docs.map(toPatient);
  return all
    .filter(
      (p) =>
        p.name.toLowerCase().includes(needle) ||
        p.phone.includes(needle) ||
        p.patient_id.toLowerCase().includes(needle)
    )
    .slice(0, 50);
}

export async function listAllPatients(clinicId: string, max = 50): Promise<Patient[]> {
  const snap = await adminDb()
    .collection("patients")
    .where("clinicId", "==", clinicId)
    .orderBy("createdAt", "desc")
    .limit(max)
    .get();
  return snap.docs.map(toPatient);
}

/** Single aggregate read regardless of collection size — used for the
 * Patients page header count instead of reading every document just to
 * count them. */
export async function getPatientCount(clinicId: string): Promise<number> {
  const snap = await adminDb().collection("patients").where("clinicId", "==", clinicId).count().get();
  return snap.data().count;
}
