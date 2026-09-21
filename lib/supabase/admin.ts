// Supabase ADMIN client — server-only, same reasoning as
// lib/firebase/admin.ts. Uses the SECRET key (full privileged access,
// bypasses RLS, can call supabase.auth.admin.*) — this must NEVER reach a
// client component or anything bundled for the browser.
import "server-only";
import { createClient as createSupabaseClient, type SupabaseClient } from "@supabase/supabase-js";

let _adminClient: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY. Check .env.local (see .env.local.example)."
    );
  }

  // No session persistence/auto-refresh — this client acts as the service
  // role on behalf of the server itself, not as any particular signed-in
  // user, so there's no browser session for it to manage.
  _adminClient = createSupabaseClient(url, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
}
