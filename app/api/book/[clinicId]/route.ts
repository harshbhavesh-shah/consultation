import { NextResponse } from "next/server";
import { createPublicBooking } from "@/lib/booking";
import { checkRateLimit } from "@/lib/rateLimit";
import { ipFromHeaders } from "@/lib/request";

// Public booking endpoint — the cross-origin counterpart to /book/[clinicId]
// (the in-app booking page). Called from the marketing site's
// appointment.njk so a single shared form can create real appointments here
// without duplicating slot/token-queue logic client-side. Reuses the exact
// same server action the in-app page calls, so both paths stay identical.
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(request: Request, { params }: { params: { clinicId: string } }) {
  // Per-IP limit. No Turnstile here yet: the marketing site's static form
  // can't render the widget. Add it there, then require a token below.
  const ip = ipFromHeaders(request.headers);
  const { allowed } = await checkRateLimit({ bucket: "booking-api", key: ip, max: 10, windowMs: 60 * 60 * 1000 });
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429, headers: CORS_HEADERS });
  }

  let body: { name?: string; phone?: string; date?: string; time?: string; consent?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400, headers: CORS_HEADERS });
  }

  const { name, phone, date, time, consent } = body;
  if (!name || !phone || !date || !time) {
    return NextResponse.json({ error: "Please fill in all fields." }, { status: 400, headers: CORS_HEADERS });
  }

  const result = await createPublicBooking(params.clinicId, { name, phone, date, time, consent: consent === true });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400, headers: CORS_HEADERS });
  }
  return NextResponse.json({ ok: true }, { headers: CORS_HEADERS });
}
