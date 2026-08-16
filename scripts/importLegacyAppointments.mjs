#!/usr/bin/env node
/**
 * One-time historical import: reads every "real queue appointment" doc
 * (service_type === "Consultation", not a session_log entry) from the
 * legacy Firebase project (appointment-booking-1f0d0, ASC_current's
 * admin.html/appointment.html/create.html) and creates matching Patient +
 * Appointment records in this app's Firestore project.
 *
 * Patient matching: by phone number, via findPatientsByPhone — reuses an
 * existing patient if one matches, otherwise creates one, same dedup
 * reasoning as the sibling apps' quick-add flows.
 *
 * Also writes idMap.json — legacyId -> consultationId pairs — which seeds
 * the Google Sheet's IdMap tab so the live Apps Script sync bridge doesn't
 * try to re-import (and duplicate) anything this script already brought in.
 * Run this ONCE, before turning on the live sync trigger.
 *
 * Usage:
 *   node scripts/importLegacyAppointments.mjs --clinicId <consultation clinicId> [--dry-run]
 *
 * Requires .env.local filled in with both FIREBASE_ADMIN_* (this project)
 * and LEGACY_FIREBASE_ADMIN_* (the legacy project) — see .env.local.example.
 */

import { config } from "dotenv";
config({ path: ".env.local" });
import { writeFileSync } from "fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function parseArgs() {
  const args = { dryRun: false };
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    const key = argv[i]?.replace(/^--/, "");
    const value = argv[i + 1];
    if (key) {
      args[key] = value;
      i++;
    }
  }
  return args;
}

function requireEnv(prefix) {
  const projectId = process.env[`${prefix}_PROJECT_ID`];
  const clientEmail = process.env[`${prefix}_CLIENT_EMAIL`];
  const privateKey = process.env[`${prefix}_PRIVATE_KEY`]?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    console.error(`Missing ${prefix}_* credentials in .env.local. See .env.local.example.`);
    process.exit(1);
  }
  return { projectId, clientEmail, privateKey };
}

// Mirrors lib/tokenQueue.ts reassignDailyTokens, duplicated here (rather
// than imported) since that file is "server-only" and this is a plain Node
// script, not a Next.js server context.
const SHIFT_BOUNDARY_HOUR = 15;
function shiftForTime(appointmentTime) {
  const hour = parseInt(appointmentTime.split(":")[0], 10);
  return hour < SHIFT_BOUNDARY_HOUR ? "morning" : "afternoon";
}

async function reassignDailyTokens(db, clinicId, appointmentDate) {
  const snap = await db
    .collection("appointments")
    .where("clinicId", "==", clinicId)
    .where("appointment_date", "==", appointmentDate)
    .get();

  const entries = [];
  snap.forEach((doc) => {
    const data = doc.data();
    if (data.status === "Cancelled") return;
    if (!data.appointment_time) return;
    entries.push({
      id: doc.id,
      appointment_time: data.appointment_time,
      createdAt: data.createdAt || 0,
      shift: shiftForTime(data.appointment_time),
    });
  });

  entries.sort((a, b) =>
    a.appointment_time !== b.appointment_time
      ? a.appointment_time < b.appointment_time
        ? -1
        : 1
      : a.createdAt - b.createdAt
  );

  const batch = db.batch();
  const shiftCounters = { morning: 0, afternoon: 0 };
  entries.forEach((entry) => {
    shiftCounters[entry.shift] += 1;
    batch.update(db.collection("appointments").doc(entry.id), {
      token_number: shiftCounters[entry.shift],
      shift: entry.shift,
    });
  });
  await batch.commit();
}

async function main() {
  const { clinicId, dryRun } = parseArgs();
  if (!clinicId) {
    console.error("Usage: node scripts/importLegacyAppointments.mjs --clinicId <consultation clinicId> [--dry-run]");
    process.exit(1);
  }

  const consultCreds = requireEnv("FIREBASE_ADMIN");
  const legacyCreds = requireEnv("LEGACY_FIREBASE_ADMIN");

  const consultApp = initializeApp({ credential: cert(consultCreds) }, "consultation");
  const legacyApp = initializeApp({ credential: cert(legacyCreds) }, "legacy");
  const consultDb = getFirestore(consultApp);
  const legacyDb = getFirestore(legacyApp);

  console.log(`Reading legacy appointments from project "${legacyCreds.projectId}"...`);
  const snap = await legacyDb.collection("appointments").get();

  const eligible = snap.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((a) => a.service_type === "Consultation" && a.entry_kind !== "session_log");

  console.log(`Found ${snap.size} total legacy appointment docs, ${eligible.length} eligible (Consultation, not a session log).`);

  const idMap = [];
  const patientCache = new Map(); // phone -> consultation patientId, avoids repeat lookups across many appointments for the same patient
  const touchedDates = new Set();
  let created = 0;
  let patientsMatched = 0;
  let patientsCreated = 0;
  let skipped = 0;

  for (const a of eligible) {
    const phone = (a.patient_phone || "").trim();
    const name = (a.patient_name || "").trim();
    if (!phone || !name || !a.appointment_date || !a.appointment_time) {
      skipped++;
      continue;
    }

    let patientId = patientCache.get(phone);
    if (!patientId) {
      if (dryRun) {
        patientId = "DRY-RUN-PATIENT";
      } else {
        // Inlined rather than importing lib/firestore/patients.ts — that
        // file is TypeScript and this is a plain Node script with no
        // ts-node/tsx guaranteed set up.
        const patientsSnap = await consultDb
          .collection("patients")
          .where("clinicId", "==", clinicId)
          .where("phone", "==", phone)
          .limit(1)
          .get();
        if (!patientsSnap.empty) {
          patientId = patientsSnap.docs[0].id;
          patientsMatched++;
        } else {
          const ref = consultDb.collection("patients").doc();
          await ref.set({
            clinicId,
            patient_id: `PT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
            name,
            phone,
            address: a.patient_address || "",
            age: a.age ?? "",
            age_unit: a.age_unit || "years",
            gender: a.gender || "",
            createdAt: Date.now(),
          });
          patientId = ref.id;
          patientsCreated++;
        }
      }
      patientCache.set(phone, patientId);
    }

    const payload = {
      clinicId,
      appointment_date: a.appointment_date,
      appointment_time: a.appointment_time,
      status: a.status === "Visited" ? "Visited" : "Booked",
      entry_source: a.entry_source === "walkin" ? "walkin" : "online",
      patientId,
      patient_name: name,
      patient_phone: phone,
      patient_address: a.patient_address || "",
      age: a.age ?? "",
      age_unit: a.age_unit || "years",
      gender: a.gender || "",
      payment: a.payment ?? "",
      payment_type: a.payment_type || "",
      reference: a.reference || "",
      diagnosis: a.diagnosis || "",
      follow_up: a.follow_up ?? "",
      follow_up_sent: a.follow_up_sent ?? false,
      follow_up_day_before_sent: a.follow_up_day_before_sent ?? false,
      call_back: a.call_back ?? "",
      call_back_due_date: a.call_back_due_date ?? null,
      call_back_completed_at: a.call_back_completed_at ?? null,
      createdBy: "legacy-import",
      createdAt: Date.now(),
      token_number: 0,
      shift: "morning",
    };

    if (dryRun) {
      idMap.push({ legacyId: a.id, consultationId: "DRY-RUN", date: a.appointment_date });
      created++;
      touchedDates.add(a.appointment_date);
      continue;
    }

    const ref = consultDb.collection("appointments").doc();
    await ref.set(payload);
    idMap.push({ legacyId: a.id, consultationId: ref.id, date: a.appointment_date });
    touchedDates.add(a.appointment_date);
    created++;
  }

  if (!dryRun) {
    console.log(`Recomputing token queues for ${touchedDates.size} distinct dates...`);
    for (const date of touchedDates) {
      await reassignDailyTokens(consultDb, clinicId, date);
    }
  }

  writeFileSync("scripts/idMap.json", JSON.stringify(idMap, null, 2));

  console.log("\nDone.");
  console.log(`  Appointments created:   ${created}${dryRun ? " (dry run, nothing written)" : ""}`);
  console.log(`  Patients matched:       ${patientsMatched}`);
  console.log(`  Patients created:       ${patientsCreated}`);
  console.log(`  Skipped (missing data): ${skipped}`);
  console.log(`  Dates recomputed:       ${touchedDates.size}`);
  console.log(`  Wrote scripts/idMap.json (${idMap.length} rows) — paste this into the Sheet's IdMap tab before enabling live sync.`);
}

main().catch((err) => {
  console.error("Import failed:", err);
  process.exit(1);
});
