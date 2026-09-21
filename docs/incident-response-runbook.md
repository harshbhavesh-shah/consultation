# Incident response runbook

Two legal clocks start when a security incident is **detected** (not when it
is confirmed):

- **CERT-In Directions, 2022** — report to CERT-In within **6 hours** of
  detecting an incident involving unauthorised access, a data breach or
  similar. This is the binding deadline; pace every step to it.
- **DPDP Act 2023 / Rules** — notify the Data Protection Board and every
  affected patient. No materiality threshold: one patient's record counts.
  Loupe is the *processor*; each affected **clinic is the fiduciary** and
  must be told immediately so it can meet its own obligations.

> Draft. Confirm the current DPDP notification deadlines and filing
> mechanism with a lawyer — the Rules phase in over time.

Note the exact time of **detection** first. If you are reading this because
something has happened, start at Step 1.

## What counts

Unauthorised access to the database or a staff account; a lost/stolen device
with an active session; data exposed by a bug or misconfigured permission
(including RLS — see `scripts/verifyTenantIsolation.mjs`); ransomware/malware
touching anything that holds patient data; a vendor (Supabase, Vercel, Meta,
Cloudflare, Resend) reporting a breach that could include our data.

## Step 1 — Contain

1. **Compromised staff account:** Supabase Dashboard → Authentication → Users
   → find the user → *Ban user* / sign out all sessions. Or with the admin
   client: `supabaseAdmin().auth.admin.updateUserById(id, { ban_duration: "876000h" })`
   and `auth.admin.signOut(jwt, "global")`.
2. **Database suspected compromised:** rotate the database password
   (Supabase → Project Settings → Database → Reset password), then update
   `DATABASE_URL` and `DIRECT_URL` in Vercel and redeploy.
3. **Key/secret leaked:** rotate it at the source and in Vercel, then redeploy:
   `SUPABASE_SECRET_KEY` (Supabase → API Keys), `CRON_SECRET`,
   `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, `TURNSTILE_SECRET_KEY`, `RESEND_KEY_ID` (Resend dashboard → API Keys, then update Vercel).
   - **`ENCRYPTION_KEY`** (encrypts WhatsApp credentials): rotating it makes
     stored credentials unreadable. Instead, treat the affected clinics'
     **Meta access tokens and app secrets as compromised** — have them
     regenerate in Meta and reconnect in Settings → Communication.
4. **Cross-clinic exposure (a query/RLS bug):** ship the fix first; use the
   audit log to scope who saw what.

## Step 2 — Scope

The `audit_logs` table records who viewed or changed patient, appointment,
staff and WhatsApp records (ids and field names only — never content):

```sql
-- Everything in a clinic during the incident window
select created_at, actor_name, actor_role, action, target_type, target_id
from audit_logs
where clinic_id = '<clinic uuid>'
  and created_at between '<start>' and '<end>'
order by created_at desc;

-- Everything that touched one patient
select * from audit_logs
where clinic_id = '<clinic uuid>' and target_type = 'Patient' and target_id = '<patient uuid>'
order by created_at desc;
```

If the incident is not app-mediated (a raw database access), scope from
Supabase logs (Dashboard → Logs) and Vercel request logs instead — less
precise, so over-notify rather than under-notify. Retain all logs; CERT-In
expects 180 days.

## Step 3 — Report to CERT-In (within 6 hours of detection)

File at cert-in.org.in (incident reporting) or email `incident@cert-in.org.in`:
what happened, when detected, systems/data affected, containment so far, and
a contact. Don't wait for full scoping — an initial report saying "scope still
being determined" is acceptable; send follow-ups.

## Step 4 — Notify clinics, the Data Protection Board, and patients

1. **Clinics first**, as soon as you know which are affected — each clinic
   must notify its patients and the Board as fiduciary. Tell them what
   happened, which records, and what you've done.
2. **Data Protection Board:** file per the process the Board publishes.
3. **Patients:** via the contact details on file, without delay — what
   happened, what of theirs was involved, what they can do. Usually the
   clinic sends this; offer to help.

## Step 5 — Close out

Write a short internal note: what happened, root cause, what was reported to
whom and when, and what changed to prevent a repeat. Keep it — it is your
evidence of compliance if CERT-In or the Board asks later.

## Who does what

This is a small team. Whoever holds owner access to Supabase and Vercel, plus
the developer maintaining the app, share all of the above. Update this
section when that changes.
