-- Letterhead details printed on prescriptions and receipts.
ALTER TABLE "clinics"
  ADD COLUMN "address" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "phone" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "doctor_name" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "doctor_qualifications" TEXT NOT NULL DEFAULT '',
  ADD COLUMN "registration_no" TEXT NOT NULL DEFAULT '';

CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "medications" JSONB NOT NULL DEFAULT '[]',
    "advice" TEXT NOT NULL DEFAULT '',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "receipts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "number" INTEGER NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_by" UUID NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prescriptions_appointment_id_key" ON "prescriptions"("appointment_id");
CREATE INDEX "prescriptions_clinic_id_created_at_idx" ON "prescriptions"("clinic_id", "created_at" DESC);
CREATE UNIQUE INDEX "receipts_appointment_id_key" ON "receipts"("appointment_id");
CREATE UNIQUE INDEX "receipts_clinic_id_number_key" ON "receipts"("clinic_id", "number");

ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "receipts" ADD CONSTRAINT "receipts_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same posture as every other table (see 20260921090000_rls_all_tables):
-- deny-by-default RLS and no API-role privileges; all access goes through
-- the trusted server connection.
ALTER TABLE "prescriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "receipts" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "prescriptions", "receipts" FROM anon, authenticated;
