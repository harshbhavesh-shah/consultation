import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware";

// Middleware runs in the Edge runtime. Unlike the old Firebase setup (whose
// Admin SDK couldn't run here at all, so this could only check whether a
// cookie was *present*), Supabase's SSR client works fine in Edge — so
// this now does a real, verified check via getClaims() (local JWT
// verification, no network round-trip), not just a cookie-presence guess.
// It also refreshes the session token when needed and writes the result
// back to cookies, which lib/supabase/server.ts's Server Component usage
// can't always do itself (see that file's comment) — this is the actual
// safety net for that.
export async function middleware(request: NextRequest) {
  const { supabase, response } = createMiddlewareClient(request);
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isProtectedRoute = pathname.startsWith("/dashboard");
  const isLoginRoute = pathname === "/login" || pathname === "/signup";

  if (isProtectedRoute && !isSignedIn) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isLoginRoute && isSignedIn) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/signup"],
};
