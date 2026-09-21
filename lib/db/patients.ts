import "server-only";
import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { prisma } from "./client";
import { normalizePhone } from "@/lib/phone";
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
  input: Pick<Patient, "name" | "phone" | "address" | "age" | "age_unit" | "gender">,
  opts: { dataConsentAt?: Date } = {}
): Promise<Patient> {
  const data = {
    clinicId,
    name: input.name,
    phone: input.phone,
    address: input.address,
    age: input.age === "" ? null : input.age,
    ageUnit: input.age_unit,
    gender: input.gender === "" ? null : input.gender,
    dataConsentAt: opts.dataConsentAt ?? null,
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

// NMC Professional Conduct Regulations require doctors to keep a patient's
// records for at least 3 years from the last treatment, so a DPDP erasure
// request can't lawfully be honored inside that window.
export const RETENTION_YEARS = 3;

function recordsFor(clinicId: string, patient: { id: string; phone: string }) {
  // Online bookings are never linked to a Patient row (patientId is null),
  // so they're matched by phone — they're this patient's records too.
  return {
    clinicId,
    OR: [{ patientId: patient.id }, { patientId: null, patientPhone: patient.phone }],
  };
}

/** Returns null when the patient may be erased, otherwise the first date
 * (YYYY-MM-DD) on which erasure becomes lawful. */
export async function checkPatientRetentionFloor(clinicId: string, patientId: string): Promise<string | null> {
  const patient = await getPatientById(clinicId, patientId);
  if (!patient) throw new Error("Patient not found");

  const last = await prisma.appointment.findFirst({
    where: recordsFor(clinicId, patient),
    orderBy: { appointmentDate: "desc" },
    select: { appointmentDate: true },
  });
  if (!last) return null;

  const eligible = new Date(`${last.appointmentDate}T00:00:00Z`);
  eligible.setUTCFullYear(eligible.getUTCFullYear() + RETENTION_YEARS);
  return eligible.getTime() > Date.now() ? eligible.toISOString().slice(0, 10) : null;
}

/** Permanently deletes a patient and everything held about them: linked and
 * phone-matched appointments, and their WhatsApp conversations/messages
 * (messages cascade from the conversation). Callers must have run
 * checkPatientRetentionFloor first and recorded an audit event. */
export async function erasePatient(clinicId: string, patientId: string): Promise<void> {
  const patient = await getPatientById(clinicId, patientId);
  if (!patient) throw new Error("Patient not found");

  await prisma.$transaction([
    prisma.appointment.deleteMany({ where: recordsFor(clinicId, patient) }),
    prisma.whatsAppConversation.deleteMany({
      where: { clinicId, OR: [{ patientId }, { phoneNumber: normalizePhone(patient.phone) }] },
    }),
    prisma.patient.deleteMany({ where: { id: patientId, clinicId } }),
  ]);
  revalidateTag(`appointments-${clinicId}`);
  revalidateTag(`whatsapp-conversations-${clinicId}`);
}
