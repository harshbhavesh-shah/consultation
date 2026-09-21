// Supabase server client — for Server Components and Server Actions.
// A new client per request, per Supabase's own guidance (never share one
// across requests). Reads the session from cookies; writes refreshed
// cookies back via `setAll`, which is only actually possible from a Server
// Action or Route Handler — a Server Component render can't set cookies at
// all, hence the try/catch (this is the standard, documented Supabase
// Next.js pattern, not a workaround for a bug).
import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

export function createClient() {
  const cookieStore = cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Check .env.local " +
      "(see .env.local.example)."
    );
  }

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render, which can't set cookies.
          // Fine as long as middleware.ts is also refreshing the session
          // (see lib/supabase/middleware.ts) — that's the actual safety net.
        }
      },
    },
  });
}
