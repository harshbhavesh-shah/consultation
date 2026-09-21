"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/session";
import { clockIn, getTodaysEntryForStaff } from "@/lib/db/attendance";

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
  try {
    await clockIn(session.clinicId, session.uid, name, today);
  } catch (err) {
    // A genuine race between two near-simultaneous clock-ins — the
    // getTodaysEntryForStaff check above already caught the common case.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { error: "You're already clocked in today." };
    }
    throw err;
  }
  revalidatePath("/dashboard/attendance");
  return {};
}
