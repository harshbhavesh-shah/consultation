-- appointments.call_back_completed_at was mistakenly typed as a
-- timestamp when the schema was first drafted; the app actually stores a
-- "YYYY-MM-DD" date string in it (same as call_back_due_date and
-- appointment_date), set via `new Date().toISOString().slice(0, 10)" in
-- app/dashboard/patients/actions.ts. Table is empty (no data migrated
-- yet), so this is a plain type change, no data to convert.
ALTER TABLE "appointments"
  ALTER COLUMN "call_back_completed_at" TYPE TEXT USING "call_back_completed_at"::TEXT;
