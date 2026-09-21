"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  setAvailabilityOverride,
  deleteAvailabilityOverride,
  type AvailabilityOverrideInput,
} from "@/lib/db/availability";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

// Unlike Communication/Settings, this isn't doctor-only — reception can
// close the clinic for a day too, same access ASC_current's calendar.html
// gave both roles.
export async function saveAvailabilityOverrideAction(
  date: string,
  input: AvailabilityOverrideInput
): Promise<{ error?: string }> {
  const session = await requireSession();
  await setAvailabilityOverride(session.clinicId, date, input, session.uid);
  revalidatePath("/dashboard/availability");
  return {};
}

export async function resetAvailabilityOverrideAction(date: string): Promise<{ error?: string }> {
  const session = await requireSession();
  await deleteAvailabilityOverride(session.clinicId, date);
  revalidatePath("/dashboard/availability");
  return {};
}
