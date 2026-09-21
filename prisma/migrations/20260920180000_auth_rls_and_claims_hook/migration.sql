-- Auth migration, part 1: the Custom Access Token Hook that plays the same
-- role Firebase custom claims (clinicId/role on the ID token) played
-- before — a Postgres function Supabase Auth calls at token-issuance time,
-- which looks up the signing-in user's clinic_id/role from `staff` and
-- injects them into the JWT. Enabling this hook (pointing Supabase Auth at
-- this function) is a project-level Auth setting, done once via the
-- dashboard after this migration runs — SQL alone can't flip that switch.
--
-- Named "staff_role" (not "role") deliberately: Supabase's own JWTs
-- already carry a claim called "role" with a different meaning (the
-- Postgres role for the request — "authenticated"/"anon"/"service_role").
-- Reusing that name for our app-level doctor/reception role would silently
-- collide with it.
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  matched_clinic_id uuid;
  matched_role public.user_role;
begin
  select clinic_id, role into matched_clinic_id, matched_role
  from public.staff
  where id = (event->>'user_id')::uuid;

  claims := coalesce(event->'claims', '{}'::jsonb);

  if matched_clinic_id is not null then
    claims := jsonb_set(claims, '{clinic_id}', to_jsonb(matched_clinic_id::text));
    claims := jsonb_set(claims, '{staff_role}', to_jsonb(matched_role::text));
  end if;

  return jsonb_set(event, '{claims}', claims);
end;
$$;

-- Supabase Auth (running as supabase_auth_admin) needs to be able to call
-- this function and read `staff` to populate the claims above — nothing
-- else should be able to call it directly.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on public.staff to supabase_auth_admin;

-- Small helpers so RLS policies read the same way firestore.rules did
-- (clinicId()/role()/isDoctor() there -> these here). auth.jwt() is a
-- built-in Supabase function returning the current request's verified JWT
-- claims as jsonb.
create or replace function public.jwt_clinic_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'clinic_id', '')::uuid
$$;

create or replace function public.jwt_is_doctor()
returns boolean
language sql
stable
as $$
  select (auth.jwt() ->> 'staff_role') = 'doctor'
$$;

-- Auth migration, part 2: Row Level Security.
--
-- IMPORTANT SCOPE NOTE: this project's server code (every Server
-- Component/Action, via lib/db/client.ts) connects to Postgres as the
-- `postgres` role through Prisma's pooled connection — a privileged
-- connection that bypasses RLS entirely, the same trust model
-- firebase-admin's Admin SDK already uses today (it bypasses
-- firestore.rules too; see that file's own comments). So RLS here isn't
-- the enforcement boundary for most tables — application code is, exactly
-- like today. RLS only actually matters for the one path that does NOT go
-- through that trusted server connection: whatsapp_conversations and
-- whatsapp_messages, which the Inbox reads directly from the browser via
-- Supabase Realtime (the direct successor to today's client-side Firestore
-- onSnapshot + firestore.rules). Those two tables get real policies below.
-- The other 9 tables intentionally have no RLS policies yet — adding them
-- would be dead code today (never evaluated, since nothing queries those
-- tables except the trusted server connection) and would risk implying a
-- protection that isn't actually active. If a future direct-client-read
-- path gets added to any of them, add real policies at that time.
alter table public.whatsapp_conversations enable row level security;
alter table public.whatsapp_messages enable row level security;

-- Read-only for clients, same as firestore.rules today ("Writes still only
-- ever happen server-side... these stay client-read-only") — no
-- insert/update/delete policies means those are denied by RLS's default.
create policy "whatsapp_conversations_select_own_clinic"
  on public.whatsapp_conversations
  for select
  to authenticated
  using (clinic_id = public.jwt_clinic_id());

create policy "whatsapp_messages_select_own_clinic"
  on public.whatsapp_messages
  for select
  to authenticated
  using (clinic_id = public.jwt_clinic_id());
