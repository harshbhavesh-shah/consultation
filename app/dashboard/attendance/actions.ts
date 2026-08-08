"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { clockIn, getTodaysEntryForStaff } from "@/lib/firestore/attendance";

function todayLocalStr(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export async function clockInAction(): Promise<{ error?: string }> {
  const session = await getSession();
  if (!session) return { error: "Not signed in." };
  if (session.role === "doctor") return { error: "Attendance clock-in is for front-desk staff only." };

  const today = todayLocalStr();
  const existing = await getTodaysEntryForStaff(session.clinicId, session.uid, today);
  if (existing) return { error: "You're already clocked in today." };

  const name = session.email?.split("@")[0] ?? "Staff";
  await clockIn(session.clinicId, session.uid, name, today);
  revalidatePath("/dashboard/attendance");
  return {};
}
