import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./client";
import type { Patient as PrismaPatient } from "@prisma/client";
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

// The translation boundary: Postgres stores age/gender as real nullable
// columns (NULL, not Firestore's "" sentinel) and createdAt as a native
// timestamp (not epoch-ms) — this is the one place that converts between
// "what Postgres correctly stores" and the `Patient` shape every caller
// across the app already expects, so nothing outside lib/db/ has to change.
function toPatient(row: PrismaPatient): Patient {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patient_id: row.patientCode,
    name: row.name,
    phone: row.phone,
    address: row.address,
    age: row.age ?? "",
    age_unit: row.ageUnit as AgeUnit,
    gender: (row.gender as Gender | null) ?? "",
    createdAt: row.createdAt.getTime(),
  };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getPatientById(clinicId: string, id: string): Promise<Patient | null> {
  // A malformed id (e.g. a stale link, or someone hand-editing the URL)
  // would make Postgres throw ("invalid input syntax for type uuid")
  // rather than just not-match — Firestore's doc ids never had that
  // failure mode, so this keeps the same forgiving "not found" behavior.
  if (!UUID_RE.test(id)) return null;
  const row = await prisma.patient.findUnique({ where: { id } });
  if (!row || row.clinicId !== clinicId) return null;
  return toPatient(row);
}

export async function findPatientsByPhone(clinicId: string, phone: string): Promise<Patient[]> {
  const rows = await prisma.patient.findMany({ where: { clinicId, phone } });
  return rows.map(toPatient);
}

export async function getPatientByCode(clinicId: string, patientCode: string): Promise<Patient | null> {
  const row = await prisma.patient.findUnique({
    where: { clinicId_patientCode: { clinicId, patientCode } },
  });
  return row ? toPatient(row) : null;
}

export async function createPatient(
  clinicId: string,
  input: Pick<Patient, "name" | "phone" | "address" | "age" | "age_unit" | "gender">
): Promise<Patient> {
  const data = {
    clinicId,
    name: input.name,
    phone: input.phone,
    address: input.address,
    age: input.age === "" ? null : input.age,
    ageUnit: input.age_unit,
    gender: input.gender === "" ? null : input.gender,
  };

  // Firestore never checked for a patient-code collision (just generated
  // one and hoped) — now that there's a real unique constraint
  // ([clinicId, patientCode]), retry with a fresh code on the
  // astronomically rare P2002 collision instead of failing the request.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const row = await prisma.patient.create({ data: { ...data, patientCode: generatePatientCode() } });
      return toPatient(row);
    } catch (err) {
      const isCollision = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!isCollision || attempt === 4) throw err;
    }
  }
  throw new Error("Failed to generate a unique patient code after 5 attempts.");
}

export async function searchPatients(clinicId: string, term: string): Promise<Patient[]> {
  const needle = term.trim();
  if (!needle) return listAllPatients(clinicId, 50);
  // Very short terms match almost everything and aren't useful yet — skip
  // the read entirely rather than scanning on every first keystroke.
  if (needle.length < 2) return [];

  // One indexed, case-insensitive query across name/phone/patient code —
  // replaces Firestore's three separate "starts with" range queries plus
  // the denormalized name_lower field, which existed only because
  // Firestore has no case-insensitive search of its own.
  const rows = await prisma.patient.findMany({
    where: {
      clinicId,
      OR: [
        { name: { startsWith: needle, mode: "insensitive" } },
        { phone: { startsWith: needle } },
        { patientCode: { startsWith: needle, mode: "insensitive" } },
      ],
    },
    take: 50,
  });
  return rows.map(toPatient);
}

export async function listAllPatients(clinicId: string, max = 50): Promise<Patient[]> {
  const rows = await prisma.patient.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
    take: max,
  });
  return rows.map(toPatient);
}

/** Single aggregate query regardless of table size — used for the
 * Patients page header count instead of reading every row just to count
 * them. */
export async function getPatientCount(clinicId: string): Promise<number> {
  return prisma.patient.count({ where: { clinicId } });
}
