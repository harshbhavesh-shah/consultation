import { NextResponse } from "next/server";
import { reassignDailyTokens } from "@/lib/tokenQueue";

// Called by the Google Apps Script sync bridge (see ASC_current sync setup
// docs) after it writes an appointment directly into this project's
// Firestore via the REST API — those writes bypass every server action in
// this app, including the reassignDailyTokens() call every native write
// path already makes, so token_number/shift would otherwise go stale for
// externally-synced appointments. Secret-header auth since this has no
// Firebase Auth session to check (Apps Script isn't a signed-in staff
// member) — SYNC_SECRET must match what's configured in the Apps Script's
// Script Properties.
export async function POST(request: Request) {
  const secret = request.headers.get("x-sync-secret");
  if (!secret || secret !== process.env.SYNC_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { clinicId?: string; date?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { clinicId, date } = body;
  if (!clinicId || !date) {
    return NextResponse.json({ error: "Missing clinicId or date." }, { status: 400 });
  }

  await reassignDailyTokens(clinicId, date);
  return NextResponse.json({ ok: true });
}
