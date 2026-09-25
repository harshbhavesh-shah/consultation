import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "./client";
import type { Receipt } from "@/types";

function toReceipt(row: { id: string; appointmentId: string; number: number; issuedAt: Date }): Receipt {
  return { id: row.id, appointmentId: row.appointmentId, number: row.number, issuedAt: row.issuedAt.getTime() };
}

/** Returns the appointment's receipt, allocating the next sequential number
 * for the clinic the first time it's asked for. The (clinic, number) unique
 * constraint makes concurrent allocations collide instead of duplicating,
 * so a collision just retries with a fresh max. */
export async function getOrCreateReceipt(clinicId: string, appointmentId: string, issuedBy: string): Promise<Receipt> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const existing = await prisma.receipt.findUnique({ where: { appointmentId } });
    if (existing) return toReceipt(existing);

    const last = await prisma.receipt.aggregate({ where: { clinicId }, _max: { number: true } });
    try {
      const row = await prisma.receipt.create({
        data: { clinicId, appointmentId, issuedBy, number: (last._max.number ?? 0) + 1 },
      });
      return toReceipt(row);
    } catch (err) {
      const conflict = err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
      if (!conflict) throw err;
    }
  }
  throw new Error("Could not allocate a receipt number.");
}
