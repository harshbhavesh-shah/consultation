"use client";

interface MinimalRouter {
  push: (href: string) => void;
  refresh: () => void;
}

/**
 * Exchanges a Firebase Auth ID token (from client-side sign-in) for a
 * session cookie, then navigates. Single-role, no 2FA/Google — this app
 * has exactly two staff roles (reception/doctor) provisioned by
 * scripts/seedClinic.mjs, not a self-serve signup flow.
 */
export async function proceedAfterSignIn(
  idToken: string,
  router: MinimalRouter,
  nextParam: string | null
): Promise<{ error?: string }> {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) return { error: "Could not start a session. Please try again." };

  router.push(nextParam || "/dashboard");
  router.refresh();
  return {};
}
