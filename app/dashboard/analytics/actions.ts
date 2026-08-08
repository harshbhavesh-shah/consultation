"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { setCashDeposit } from "@/lib/firestore/cashDeposits";

export async function setBankDepositAction(period: string, amount: number): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };
  if (session.role !== "doctor") return { error: "Only a doctor can record bank deposits." };

  await setCashDeposit(session.clinicId, period, amount, session.uid);
  revalidatePath("/dashboard/analytics");
  return {};
}
