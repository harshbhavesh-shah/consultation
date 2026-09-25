import "server-only";
import { prisma } from "./client";
import type { Prisma } from "@prisma/client";
import type { Medication, Prescription, PrescriptionTemplate } from "@/types";

const MAX_MEDICATIONS = 30;
const MAX_FIELD = 200;
const MAX_ADVICE = 2000;

/** Trims, drops rows with no drug name, and caps sizes. The medications
 * array arrives from the client, so it's never trusted as-is. */
export function sanitizeMedications(input: unknown): Medication[] {
  if (!Array.isArray(input)) return [];
  const str = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_FIELD) : "");
  return input
    .slice(0, MAX_MEDICATIONS)
    .map((m) => {
      const row = (m ?? {}) as Record<string, unknown>;
      return {
        name: str(row.name),
        dose: str(row.dose),
        frequency: str(row.frequency),
        duration: str(row.duration),
        instructions: str(row.instructions),
      };
    })
    .filter((m) => m.name !== "");
}

export function sanitizeAdvice(input: unknown): string {
  return typeof input === "string" ? input.trim().slice(0, MAX_ADVICE) : "";
}

export async function getPrescription(clinicId: string, appointmentId: string): Promise<Prescription | null> {
  const row = await prisma.prescription.findUnique({ where: { appointmentId } });
  if (!row || row.clinicId !== clinicId) return null;
  return {
    id: row.id,
    appointmentId: row.appointmentId,
    medications: sanitizeMedications(row.medications),
    advice: row.advice,
    updatedAt: row.updatedAt.getTime(),
  };
}

export async function savePrescription(
  clinicId: string,
  appointmentId: string,
  createdBy: string,
  medications: Medication[],
  advice: string
): Promise<void> {
  const meds = medications as unknown as Prisma.InputJsonValue;
  await prisma.prescription.upsert({
    where: { appointmentId },
    create: { clinicId, appointmentId, createdBy, medications: meds, advice },
    update: { medications: meds, advice },
  });
}

function toTemplate(row: { id: string; name: string; medications: Prisma.JsonValue; advice: string }): PrescriptionTemplate {
  return { id: row.id, name: row.name, medications: sanitizeMedications(row.medications), advice: row.advice };
}

export async function listTemplates(clinicId: string): Promise<PrescriptionTemplate[]> {
  const rows = await prisma.prescriptionTemplate.findMany({ where: { clinicId }, orderBy: { name: "asc" } });
  return rows.map(toTemplate);
}

/** Saving under an existing name replaces that template. */
export async function saveTemplate(
  clinicId: string,
  createdBy: string,
  name: string,
  medications: Medication[],
  advice: string
): Promise<PrescriptionTemplate> {
  const meds = medications as unknown as Prisma.InputJsonValue;
  const row = await prisma.prescriptionTemplate.upsert({
    where: { clinicId_name: { clinicId, name } },
    create: { clinicId, createdBy, name, medications: meds, advice },
    update: { medications: meds, advice },
  });
  return toTemplate(row);
}

export async function deleteTemplate(clinicId: string, id: string): Promise<void> {
  await prisma.prescriptionTemplate.deleteMany({ where: { id, clinicId } });
}
