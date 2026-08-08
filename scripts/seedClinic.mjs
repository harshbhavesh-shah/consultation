#!/usr/bin/env node
/**
 * Bootstraps the clinic (tenant) and its staff accounts, with the correct
 * Firebase Auth custom claims (clinicId + role) that the whole app relies
 * on for tenant isolation and role-based access. There's no self-serve
 * signup UI in this app — this is how you create clinic accounts.
 *
 * Also creates each user's Firestore staff mirror doc.
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
 * Requires .env.local to be filled in with FIREBASE_ADMIN_* values.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

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

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.error("Missing Firebase Admin credentials in .env.local. See .env.local.example.");
    process.exit(1);
  }

  initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  const auth = getAuth();
  const db = getFirestore();

  let clinicId = existingClinicId;

  if (!clinicId) {
    const clinicRef = db.collection("clinics").doc();
    await clinicRef.set({ name: clinicName, createdAt: Date.now() });
    clinicId = clinicRef.id;
    console.log(`✓ Created clinic "${clinicName}" (id: ${clinicId})`);
  }

  const userRecord = await auth.createUser({ email, password, displayName: staffName });
  console.log(`✓ Created user ${email} (uid: ${userRecord.uid})`);

  await auth.setCustomUserClaims(userRecord.uid, { clinicId, role });
  console.log(`✓ Set custom claims: { clinicId: "${clinicId}", role: "${role}" }`);

  await db.collection("staff").doc(userRecord.uid).set({
    clinicId,
    uid: userRecord.uid,
    name: staffName,
    email,
    role,
    createdAt: Date.now(),
  });
  console.log(`✓ Created staff record for "${staffName}"`);

  console.log(`\nDone. This user can sign in at /login with the email/password above.`);
  console.log(`Clinic id for future staff: ${clinicId}`);
}

main().catch((err) => {
  console.error("Failed to seed clinic:", err);
  process.exit(1);
});
