#!/usr/bin/env node
/**
 * Bootstraps the clinic (tenant) and its staff accounts. There's no
 * self-serve signup UI for adding staff to an existing clinic — this is
 * how you create those accounts.
 *
 * Creates a Supabase Auth user and the Postgres `staff` row the auth
 * claims hook reads from (see
 * prisma/migrations/20260920180000_auth_rls_and_claims_hook) to put
 * clinic_id/staff_role on that user's JWT.
 *
 * Usage (create a clinic + one staff account):
 *   node scripts/seedClinic.mjs \
 *     --clinicName "Advanced Skin Clinic" \
 *     --name "Dr. Bhavesh Shah" \
 *     --email doctor@example.com \
 *     --password "some-temporary-password" \
 *     --role doctor
 *
 * To add another staff member to an EXISTING clinic, pass --clinicId
 * instead of --clinicName:
 *   node scripts/seedClinic.mjs \
 *     --clinicId <id> \
 *     --name "Reception" \
 *     --email reception@example.com \
 *     --password "some-temporary-password" \
 *     --role reception
 *
 * Requires .env.local to be filled in with DATABASE_URL, SUPABASE_SECRET_KEY,
 * and NEXT_PUBLIC_SUPABASE_URL values.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function parseArgs() {
  const args = {};
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 2) {
    const key = argv[i]?.replace(/^--/, "");
    const value = argv[i + 1];
    if (key) args[key] = value;
  }
  return args;
}

async function main() {
  const { clinicName, clinicId: existingClinicId, email, password, role, name } = parseArgs();
  const staffName = name || email?.split("@")[0] || "Staff";

  if ((!clinicName && !existingClinicId) || !email || !password || !role) {
    console.error(
      "Usage: node scripts/seedClinic.mjs --clinicName \"Name\" --email you@example.com " +
      "--password \"temp-password\" --role reception|doctor\n" +
      "   or: node scripts/seedClinic.mjs --clinicId <id> --email you@example.com " +
      "--password \"temp-password\" --role reception|doctor"
    );
    process.exit(1);
  }

  if (!["reception", "doctor"].includes(role)) {
    console.error(`Invalid role "${role}". Must be one of: reception, doctor.`);
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !supabaseSecretKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY in .env.local. See .env.local.example.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseSecretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const prisma = new PrismaClient({ adapter: new PrismaPg(process.env.DATABASE_URL) });

  let clinicId = existingClinicId;

  if (!clinicId) {
    const clinic = await prisma.clinic.create({ data: { name: clinicName } });
    clinicId = clinic.id;
    console.log(`✓ Created clinic "${clinicName}" (id: ${clinicId})`);
  }

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: staffName },
  });
  if (userError || !userData.user) {
    console.error("Failed to create Supabase auth user:", userError);
    process.exit(1);
  }
  const uid = userData.user.id;
  console.log(`✓ Created user ${email} (uid: ${uid})`);

  await prisma.staff.create({ data: { id: uid, clinicId, name: staffName, email, role } });
  console.log(`✓ Created Postgres staff row: { clinicId: "${clinicId}", role: "${role}" }`);

  console.log(`\nDone. This user can sign in at /login with the email/password above.`);
  console.log(`Clinic id for future staff: ${clinicId}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("Failed to seed clinic:", err);
  process.exit(1);
});
