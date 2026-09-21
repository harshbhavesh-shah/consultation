"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Replaces the old Firebase flow entirely: client-side signInWithEmailAndPassword
 * -> get an ID token -> POST it to /api/auth/session to exchange for a
 * cookie. Supabase's server client sets the session cookie as a side
 * effect of signInWithPassword itself (via the setAll callback in
 * lib/supabase/server.ts), so this one server action does the whole job —
 * no client-side auth SDK call, no separate exchange step, no
 * /api/auth/session route.
 */
export async function signInAction(email: string, password: string): Promise<{ error?: string }> {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: describeAuthError(error) };
  return {};
}

export async function signOutAction(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
}

function describeAuthError(error: { message: string; code?: string }): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Incorrect email or password.";
    case "over_request_rate_limit":
      return "Too many failed attempts. Please wait a moment and try again.";
    default:
      return error.message || "Something went wrong signing in. Please try again.";
  }
}
