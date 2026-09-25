import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "./client";
import type { Clinic, ClinicLetterhead } from "@/types";

function clinicTag(clinicId: string): string {
  return `clinic-${clinicId}`;
}

// Fetched on every /dashboard page load (see app/dashboard/layout.tsx). The
// name never changes after signup; the letterhead fields change only via
// updateClinicLetterhead, which revalidates the tag below.
export async function getClinic(clinicId: string): Promise<Clinic | null> {
  return unstable_cache(
    async () => {
      const row = await prisma.clinic.findUnique({ where: { id: clinicId } });
      if (!row) return null;
      return {
        id: row.id,
        name: row.name,
        createdAt: row.createdAt.getTime(),
        address: row.address,
        phone: row.phone,
        doctorName: row.doctorName,
        doctorQualifications: row.doctorQualifications,
        registrationNo: row.registrationNo,
      };
    },
    ["clinic", clinicId],
    { revalidate: 300, tags: [clinicTag(clinicId)] }
  )();
}

export async function updateClinicLetterhead(clinicId: string, data: ClinicLetterhead): Promise<void> {
  await prisma.clinic.update({ where: { id: clinicId }, data });
  revalidateTag(clinicTag(clinicId));
}
