import { NextResponse } from "next/server";
import { getAppointmentsForDate } from "@/lib/db/appointments";
import { getAvailabilityOverride } from "@/lib/db/availability";
import { generateDailySlots, isBookableDate, shiftForTime } from "@/lib/slots";

// Public, read-only: returns which HH:MM slots are already taken for a
// given clinic + date, so the booking page can grey them out live. Goes
// through the Admin SDK (server-only) rather than a client-side Firestore
// read, since the public booking flow has no Firebase Auth session to
// satisfy firestore.rules' isSignedIn() check.
//
// CORS is wide open (no credentials involved — this returns no patient
// data, just a list of taken times) since it's also called cross-origin
// from the marketing site's static appointment page.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request, { params }: { params: { clinicId: string } }) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ error: "Missing date" }, { status: 400, headers: CORS_HEADERS });

  const override = await getAvailabilityOverride(params.clinicId, date);
  const closed = !isBookableDate(date, override);

  const [appointments, allSlots] = await Promise.all([
    getAppointmentsForDate(params.clinicId, date),
    Promise.resolve(closed ? [] : generateDailySlots(override)),
  ]);
  const bookedTimes = appointments.filter((a) => a.status !== "Cancelled" && a.status !== "NoShow").map((a) => a.appointment_time);
  const morningSlots = allSlots.filter((t) => shiftForTime(t) === "morning");
  const eveningSlots = allSlots.filter((t) => shiftForTime(t) === "afternoon");

  // This is public and uncredentialed (see CORS note above), so it's the
  // most exposed read in the app — a short browser/CDN cache means a burst
  // of requests for the same clinic+date (repeated page loads, a bot) is
  // absorbed before it even reaches getAppointmentsForDate's own cache.
  return NextResponse.json(
    { closed, morningSlots, eveningSlots, bookedTimes },
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=15, s-maxage=15" } }
  );
}
