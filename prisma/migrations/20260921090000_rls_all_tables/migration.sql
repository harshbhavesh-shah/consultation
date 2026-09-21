-- Tenant-isolation hardening: deny-by-default RLS on EVERY table in `public`.
--
-- Why this is needed even though the app's server code connects as the
-- privileged `postgres` role (which bypasses RLS): Supabase also exposes
-- every `public` table through its auto-generated REST API (PostgREST),
-- reachable with the *publishable* key that ships to every browser. A
-- table with RLS disabled is fully readable/writable through that API by
-- anyone holding that key — including patients, appointments and the
-- WhatsApp credentials in whatsapp_connections. The earlier migration
-- (20260920180000) left 9 tables that way on the reasoning that nothing in
-- the app queries them from the browser; that is true of the app, but not
-- of an attacker calling the REST API directly.
--
-- Enabling RLS with no policy = no access for `anon`/`authenticated`, while
-- the server's `postgres` connection is unaffected. The two Inbox tables
-- keep the SELECT-own-clinic policies from the earlier migration.

do $$
declare
  t record;
begin
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end $$;

-- Belt and braces: also remove the table privileges Supabase grants to the
-- API roles by default, so access stays denied even if RLS were ever
-- disabled on a table by mistake. Re-grant SELECT on the two tables the
-- browser legitimately reads (Inbox Realtime).
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant select on public.whatsapp_conversations, public.whatsapp_messages to authenticated;

-- Future tables: don't hand API roles default privileges again.
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

-- The Custom Access Token Hook runs as supabase_auth_admin, which does NOT
-- bypass RLS. Now that `staff` has RLS enabled, it needs an explicit policy
-- to read the row it builds the JWT claims from — without this, sign-in
-- would stop issuing clinic_id/staff_role claims.
create policy "staff_select_for_auth_hook"
  on public.staff
  for select
  to supabase_auth_admin
  using (true);
