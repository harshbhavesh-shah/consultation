import { NextResponse } from "next/server";
import { getAppointmentsForDate } from "@/lib/firestore/appointments";

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

  const appointments = await getAppointmentsForDate(params.clinicId, date);
  const bookedTimes = appointments.filter((a) => a.status !== "Cancelled").map((a) => a.appointment_time);
  // This is public and uncredentialed (see CORS note above), so it's the
  // most exposed read in the app — a short browser/CDN cache means a burst
  // of requests for the same clinic+date (repeated page loads, a bot) is
  // absorbed before it even reaches getAppointmentsForDate's own cache.
  return NextResponse.json(
    { bookedTimes },
    { headers: { ...CORS_HEADERS, "Cache-Control": "public, max-age=15, s-maxage=15" } }
  );
}
