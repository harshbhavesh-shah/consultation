-- "Call in": doctor -> reception live notification.
CREATE TABLE "patient_calls" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "patient_name" TEXT NOT NULL,
    "token_number" INTEGER NOT NULL,
    "called_by" UUID NOT NULL,
    "called_by_name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "acknowledged_at" TIMESTAMP(3),
    "acknowledged_by" UUID,

    CONSTRAINT "patient_calls_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "patient_calls_clinic_id_created_at_idx" ON "patient_calls"("clinic_id", "created_at" DESC);
CREATE INDEX "patient_calls_appointment_id_idx" ON "patient_calls"("appointment_id");

ALTER TABLE "patient_calls" ADD CONSTRAINT "patient_calls_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Cascade so deleting an appointment (including a patient erasure) also
-- removes the call rows that snapshot the patient's name.
ALTER TABLE "patient_calls" ADD CONSTRAINT "patient_calls_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same posture as the rest of the schema (see 20260921090000_rls_all_tables):
-- deny-by-default RLS, no API-role privileges — EXCEPT read access for a
-- signed-in user's own clinic, because reception's browser subscribes to
-- this table through Supabase Realtime (which evaluates this policy with the
-- subscriber's JWT). All writes go through the trusted server connection.
ALTER TABLE "patient_calls" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "patient_calls" FROM anon, authenticated;
GRANT SELECT ON "patient_calls" TO authenticated;

CREATE POLICY "patient_calls_select_own_clinic"
  ON "patient_calls"
  FOR SELECT
  TO authenticated
  USING (clinic_id = public.jwt_clinic_id());

ALTER PUBLICATION supabase_realtime ADD TABLE "patient_calls";
