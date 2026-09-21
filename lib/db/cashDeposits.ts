import "server-only";
import { prisma } from "./client";
import type { CashDeposit } from "@/types";

export async function getCashDeposit(clinicId: string, period: string): Promise<CashDeposit | null> {
  const row = await prisma.cashDeposit.findUnique({ where: { clinicId_period: { clinicId, period } } });
  if (!row) return null;
  return {
    clinicId: row.clinicId,
    period: row.period,
    amount: row.amount.toNumber(),
    updatedAt: row.updatedAt.getTime(),
    updatedBy: row.updatedBy,
  };
}

export async function setCashDeposit(clinicId: string, period: string, amount: number, updatedBy: string): Promise<void> {
  await prisma.cashDeposit.upsert({
    where: { clinicId_period: { clinicId, period } },
    create: { clinicId, period, amount, updatedBy },
    update: { amount, updatedBy },
  });
}
