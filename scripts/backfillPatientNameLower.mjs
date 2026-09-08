#!/usr/bin/env node
/**
 * One-off migration: stamps `name_lower` (lowercased patient name) onto
 * every existing patient doc that's missing it. searchPatients() in
 * lib/firestore/patients.ts uses this field for an indexed "starts with"
 * query instead of scanning the whole patients collection per search — run
 * this once after deploying that change so existing patients (created
 * before name_lower existed) are still searchable by name.
 *
 * Usage:
 *   node scripts/backfillPatientNameLower.mjs
 *
 * Requires .env.local to be filled in with FIREBASE_ADMIN_* values.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (!projectId || !clientEmail || !privateKey) {
  console.error("Missing Firebase Admin credentials in .env.local");
  process.exit(1);
}

initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
const db = getFirestore();

async function main() {
  const snap = await db.collection("patients").get();
  console.log(`Scanning ${snap.size} patient docs…`);

  let batch = db.batch();
  let pending = 0;
  let updated = 0;

  for (const doc of snap.docs) {
    const data = doc.data();
    if (typeof data.name_lower === "string") continue;
    batch.update(doc.ref, { name_lower: (data.name ?? "").toLowerCase() });
    pending++;
    updated++;
    if (pending === 400) {
      await batch.commit();
      batch = db.batch();
      pending = 0;
    }
  }
  if (pending > 0) await batch.commit();

  console.log(`Done. Backfilled name_lower on ${updated} patient doc(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
