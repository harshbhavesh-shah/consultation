import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Session, UserRole } from "@/types";

/**
 * Reads and verifies the current session. Returns null if there's no
 * session, it's expired/invalid, or it's missing the clinic_id/staff_role
 * claims (meaning the account wasn't provisioned correctly — see
 * scripts/seedClinic.mjs). Use this in server components and API routes to
 * gate access — NOT in middleware, since it needs the Node runtime.
 *
 * Backed by Supabase Auth now (was Firebase). This function's signature
 * and return shape are UNCHANGED on purpose — every call site across the
 * app (dashboard pages, server actions) keeps working without touching
 * them.
 *
 * Uses getClaims(), which verifies the JWT locally against this project's
 * signing key (asymmetric ECC — see Project Settings > JWT Keys) with NO
 * network round-trip per call. This is the direct fix for the exact
 * performance bug the old Firebase implementation had here
 * (verifySessionCookie(cookie, true) forced a network call to Firebase's
 * Auth API on every single page load, twice per request even, since both
 * the dashboard layout and every page under it called getSession()
 * independently).
 */
export async function getSession(): Promise<Session | null> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return null;

  const claims = data.claims;
  const clinicId = claims.clinic_id as string | undefined;
  const role = claims.staff_role as UserRole | undefined;

  if (!clinicId || !role) return null;

  return {
    uid: claims.sub as string,
    email: (claims.email as string | undefined) ?? null,
    clinicId,
    role,
  };
}
