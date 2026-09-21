// Supabase's session-refresh client for middleware.ts. Unlike
// lib/supabase/server.ts (which uses next/headers' cookies()), middleware
// reads/writes cookies on the NextRequest/NextResponse pair directly.
//
// IMPORTANT (per Supabase's own docs): failing to wire getAll/setAll
// exactly like this causes hard-to-debug auth bugs — random logouts, early
// session termination — because a refreshed token that isn't written back
// to both the request (for this pass) and the response (for the browser)
// gets silently dropped.
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  return { supabase, response };
}
