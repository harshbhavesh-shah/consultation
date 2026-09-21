import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Session, UserRole } from "@/types";

// Session reading is backed by Supabase Auth and verified locally with
// getClaims(): the JWT is checked against the project's signing key with NO
// network round-trip per call (the old Firebase version made one on every
// page load). Returns nothing for a missing/expired/invalid session or one
// lacking the clinic_id/staff_role claims (an account that wasn't
// provisioned correctly — see scripts/seedClinic.mjs). Use in server
// components, server actions and API routes — NOT in middleware, which
// only needs the raw claims.
export type AuthState =
  | { status: "signed-out" }
  | { status: "mfa-required" }
  | { status: "ok"; session: Session };

// Doctors (clinic owners, with access to every record and staff/billing
// controls) must sign in with a second factor. Reception is not required
// to. Set MFA_ENFORCED=false ONLY for local development; it defaults on.
function mfaRequiredFor(role: UserRole): boolean {
  return role === "doctor" && process.env.MFA_ENFORCED !== "false";
}

/**
 * Like getSession(), but distinguishes "not signed in" from "signed in with
 * a password but still owes a second factor" so the dashboard layout can
 * send the second case to /mfa instead of /login.
 *
 * The `aal` claim is 'aal1' after a password sign-in and 'aal2' once a TOTP
 * code has been verified in this session. It comes from the same locally
 * verified JWT as everything else here — no extra network call.
 */
export async function getAuthState(): Promise<AuthState> {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data) return { status: "signed-out" };

  const claims = data.claims;
  const clinicId = claims.clinic_id as string | undefined;
  const role = claims.staff_role as UserRole | undefined;
  if (!clinicId || !role) return { status: "signed-out" };

  if (mfaRequiredFor(role) && claims.aal !== "aal2") return { status: "mfa-required" };

  return {
    status: "ok",
    session: {
      uid: claims.sub as string,
      email: (claims.email as string | undefined) ?? null,
      clinicId,
      role,
    },
  };
}

/**
 * The session for server components, server actions and API routes. Null
 * unless fully authenticated — including the second factor for doctors, so
 * a password-only session can't call a server action directly even though
 * it can technically reach the dashboard URL.
 */
export async function getSession(): Promise<Session | null> {
  const state = await getAuthState();
  return state.status === "ok" ? state.session : null;
}
