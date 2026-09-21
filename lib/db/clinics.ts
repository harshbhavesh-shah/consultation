import "server-only";
import { unstable_cache } from "next/cache";
import { prisma } from "./client";
import type { Clinic } from "@/types";

// Fetched on every /dashboard page load (see app/dashboard/layout.tsx) but
// the clinic row is effectively immutable after signup — no update path
// exists — so a long revalidate window is safe with no cache-tag wiring.
export async function getClinic(clinicId: string): Promise<Clinic | null> {
  return unstable_cache(
    async () => {
      const row = await prisma.clinic.findUnique({ where: { id: clinicId } });
      if (!row) return null;
      return { id: row.id, name: row.name, createdAt: row.createdAt.getTime() };
    },
    ["clinic", clinicId],
    { revalidate: 300 }
  )();
}
