// Supabase browser client — for client components. Session cookies are
// handled automatically (shared with the server client's cookies via
// @supabase/ssr, no manual config needed). Used by the Inbox for Realtime
// subscriptions — RLS on whatsapp_conversations/whatsapp_messages (see
// prisma/migrations/20260920180000_auth_rls_and_claims_hook) scopes what
// this client can actually receive to the signed-in user's own clinic,
// the direct successor to firestore.rules' client-read protection.
"use client";

import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;
  return createBrowserClient(url, publishableKey);
}
