CREATE TABLE "prescription_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "medications" JSONB NOT NULL DEFAULT '[]',
    "advice" TEXT NOT NULL DEFAULT '',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescription_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "prescription_templates_clinic_id_name_key" ON "prescription_templates"("clinic_id", "name");

ALTER TABLE "prescription_templates" ADD CONSTRAINT "prescription_templates_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Deny-by-default RLS, server-only access (see 20260921090000_rls_all_tables).
ALTER TABLE "prescription_templates" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "prescription_templates" FROM anon, authenticated;
