// Account recovery for a doctor who lost their authenticator device: removes
// all of that user's MFA factors so they can enrol a new one at next sign-in.
// Run ONLY after verifying the requester's identity out-of-band (phone call,
// known contact) — this bypasses the second factor by design.
//
//   node --env-file=.env.local scripts/resetMfa.mjs doctor@clinic.in
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: node --env-file=.env.local scripts/resetMfa.mjs <email>");
  process.exit(1);
}

const db = new pg.Client({ connectionString: process.env.DIRECT_URL, ssl: { rejectUnauthorized: false } });
await db.connect();
const { rows } = await db.query("select id, clinic_id, role from staff where lower(email) = $1", [email]);
if (rows.length !== 1) {
  console.error(`Expected exactly one staff account for ${email}, found ${rows.length}.`);
  await db.end();
  process.exit(1);
}
const userId = rows[0].id;

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await admin.auth.admin.mfa.listFactors({ userId });
if (error) throw error;
for (const factor of data.factors) {
  const res = await admin.auth.admin.mfa.deleteFactor({ userId, id: factor.id });
  if (res.error) throw res.error;
}
// Kill existing sessions too, in case the device loss was a theft.
await admin.auth.admin.signOut(userId, "global").catch(() => {});

// Same audit trail as in-app events (the app's audit_logs table).
await db.query(
  `insert into audit_logs (clinic_id, actor_uid, actor_name, actor_role, action, target_type, target_id)
   values ($1, $2, 'support-script', $3, 'staff.mfa_reset', 'Staff', $2)`,
  [rows[0].clinic_id, userId, rows[0].role]
);
await db.end();
console.log(`Removed ${data.factors.length} factor(s) for ${email}. They will be asked to enrol again at next sign-in.`);
