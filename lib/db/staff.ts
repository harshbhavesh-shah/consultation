import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "./client";
import type { Staff } from "@/types";

// Read on every dashboard page load. Tag is invalidated in
// app/dashboard/settings/actions.ts on staff add/remove.
export async function listClinicStaff(clinicId: string): Promise<Staff[]> {
  return unstable_cache(
    async () => {
      const rows = await prisma.staff.findMany({ where: { clinicId } });
      // Staff.id (Postgres, == the Supabase auth user's id) maps to the
      // app's `uid` field — named that way from when it held the Firebase
      // Auth UID; kept as-is so nothing outside lib/db/ has to change.
      return rows.map((row) => ({
        uid: row.id,
        clinicId: row.clinicId,
        name: row.name,
        email: row.email,
        role: row.role,
        createdAt: row.createdAt.getTime(),
      }));
    },
    ["clinic-staff", clinicId],
    { revalidate: 120, tags: [`staff-${clinicId}`] }
  )();
}
