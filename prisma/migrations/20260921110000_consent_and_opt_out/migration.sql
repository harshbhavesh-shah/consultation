ALTER TABLE "patients" ADD COLUMN "data_consent_at" TIMESTAMP(3);
ALTER TABLE "appointments" ADD COLUMN "data_consent_at" TIMESTAMP(3);
ALTER TABLE "whatsapp_conversations" ADD COLUMN "opted_out" BOOLEAN NOT NULL DEFAULT false;
