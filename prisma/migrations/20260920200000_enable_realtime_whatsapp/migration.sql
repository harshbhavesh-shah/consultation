-- Supabase Realtime only broadcasts Postgres Changes for tables explicitly
-- added to this publication. This is the direct successor to
-- components/inbox/InboxClient.tsx's Firestore onSnapshot listeners — RLS
-- on these two tables (see the auth_rls_and_claims_hook migration) is what
-- scopes each subscriber to their own clinic's rows, same protection
-- firestore.rules gave the old client-side listeners.
ALTER PUBLICATION supabase_realtime ADD TABLE whatsapp_conversations, whatsapp_messages;
