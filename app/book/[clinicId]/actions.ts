"use server";

import { createPublicBooking, type BookingResult } from "@/lib/booking";
import { checkRateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/request";
import { verifyTurnstileToken } from "@/lib/turnstile";

export type { BookingResult };

// The in-app booking form's entry point. The booking logic itself lives in
// lib/booking.ts (not a server action, so it can't be called from the
// browser directly and skip the checks below).
export async function createPublicBookingAction(
  clinicId: string,
  input: { name: string; phone: string; date: string; time: string; consent: boolean },
  turnstileToken: string
): Promise<BookingResult> {
  const ip = getClientIp();
  const { allowed } = await checkRateLimit({ bucket: "booking", key: ip, max: 10, windowMs: 60 * 60 * 1000 });
  if (!allowed) return { error: "Too many booking attempts. Please try again later." };
  if (!(await verifyTurnstileToken(turnstileToken, ip))) {
    return { error: "Please complete the verification challenge and try again." };
  }
  return createPublicBooking(clinicId, input);
}
