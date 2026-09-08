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
  // name_lower is a denormalized, indexed prefix-search field — Firestore
  // has no case-insensitive substring index, so searchPatients() below
  // relies on this instead of scanning every patient doc per search.
  await ref.set({ clinicId, patient_id, createdAt, name_lower: input.name.trim().toLowerCase(), ...input });
  return { id: ref.id, clinicId, patient_id, createdAt, ...input };
}

// U+F8FF is a high private-use codepoint Firestore's docs recommend for
// "starts with" range queries: it sorts after any realistic prefix, so
// `[prefix, prefix + PREFIX_END]` bounds every string starting with `prefix`.
const PREFIX_END = "";

export async function searchPatients(clinicId: string, term: string): Promise<Patient[]> {
  const needle = term.trim().toLowerCase();
  if (!needle) return listAllPatients(clinicId, 50);
  // Very short terms match almost everything and aren't useful yet — skip
  // the read entirely rather than scanning on every first keystroke.
  if (needle.length < 2) return [];

  const base = adminDb().collection("patients").where("clinicId", "==", clinicId);

  // Three independent, indexed "starts with" queries (name, phone, patient
  // code) each capped at 20 docs, instead of one unbounded scan of the
  // whole clinic filtered in memory. Firestore bills per document read, so
  // this turns an O(clinic size) read into a flat, small O(1) one.
  const [byName, byPhone, byCode] = await Promise.all([
    base
      .where("name_lower", ">=", needle)
      .where("name_lower", "<=", needle + PREFIX_END)
      .limit(20)
      .get(),
    base
      .where("phone", ">=", needle)
      .where("phone", "<=", needle + PREFIX_END)
      .limit(20)
      .get(),
    base
      .where("patient_id", ">=", needle.toUpperCase())
      .where("patient_id", "<=", needle.toUpperCase() + PREFIX_END)
      .limit(20)
      .get(),
  ]);

  const byId = new Map<string, Patient>();
  for (const snap of [byName, byPhone, byCode]) {
    for (const doc of snap.docs) byId.set(doc.id, toPatient(doc));
  }
  return Array.from(byId.values()).slice(0, 50);
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
