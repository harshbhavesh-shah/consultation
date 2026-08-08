import "server-only";
import { adminDb } from "@/lib/firebase/admin";
import type { CashDeposit } from "@/types";

function docId(clinicId: string, period: string): string {
  return `${clinicId}_${period}`;
}

export async function getCashDeposit(clinicId: string, period: string): Promise<CashDeposit | null> {
  const doc = await adminDb().collection("cashDeposits").doc(docId(clinicId, period)).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    clinicId: data.clinicId,
    period: data.period,
    amount: data.amount ?? 0,
    updatedAt: data.updatedAt,
    updatedBy: data.updatedBy,
  };
}

export async function setCashDeposit(
  clinicId: string,
  period: string,
  amount: number,
  updatedBy: string
): Promise<void> {
  await adminDb()
    .collection("cashDeposits")
    .doc(docId(clinicId, period))
    .set({ clinicId, period, amount, updatedAt: Date.now(), updatedBy });
}
