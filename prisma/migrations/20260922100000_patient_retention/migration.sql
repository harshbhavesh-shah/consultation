-- Patient retention (ported from RadianceLaser): a No-show appointment
-- status, configurable no-show follow-ups, a send log, and the survey.

-- New status. Nothing in this migration uses the value, so it is safe to add
-- inside the migration's transaction.
ALTER TYPE "appointment_status" ADD VALUE IF NOT EXISTS 'NoShow';

CREATE TYPE "no_show_follow_up_kind" AS ENUM ('survey', 'incentive', 'reminder', 'custom');

ALTER TABLE "appointments" ADD COLUMN "follow_up_dismissed" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "no_show_follow_ups" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "no_show_follow_up_kind" NOT NULL,
    "template_id" UUID NOT NULL,
    "offer_text" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "enabled_since" TIMESTAMP(3),
    "delay_hours" INTEGER NOT NULL DEFAULT 4,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "no_show_follow_ups_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "no_show_follow_ups_clinic_id_idx" ON "no_show_follow_ups"("clinic_id");
ALTER TABLE "no_show_follow_ups" ADD CONSTRAINT "no_show_follow_ups_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "no_show_follow_ups" ADD CONSTRAINT "no_show_follow_ups_template_id_fkey"
  FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "no_show_message_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "follow_up_id" UUID NOT NULL,
    "follow_up_name" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "no_show_message_logs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "no_show_message_logs_appointment_id_follow_up_id_key"
  ON "no_show_message_logs"("appointment_id", "follow_up_id");
CREATE INDEX "no_show_message_logs_clinic_id_sent_at_idx" ON "no_show_message_logs"("clinic_id", "sent_at" DESC);
ALTER TABLE "no_show_message_logs" ADD CONSTRAINT "no_show_message_logs_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "no_show_message_logs" ADD CONSTRAINT "no_show_message_logs_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "no_show_survey_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "appointment_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "reason" TEXT,
    "comment" TEXT,
    "sent_at" TIMESTAMP(3),
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "no_show_survey_responses_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "no_show_survey_responses_appointment_id_key" ON "no_show_survey_responses"("appointment_id");
CREATE UNIQUE INDEX "no_show_survey_responses_token_key" ON "no_show_survey_responses"("token");
CREATE INDEX "no_show_survey_responses_clinic_id_responded_at_idx"
  ON "no_show_survey_responses"("clinic_id", "responded_at" DESC);
ALTER TABLE "no_show_survey_responses" ADD CONSTRAINT "no_show_survey_responses_clinic_id_fkey"
  FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "no_show_survey_responses" ADD CONSTRAINT "no_show_survey_responses_appointment_id_fkey"
  FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Same posture as every other table (see 20260921090000_rls_all_tables):
-- deny-by-default RLS and no API-role privileges — all access goes through
-- the trusted server connection.
ALTER TABLE "no_show_follow_ups" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "no_show_message_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "no_show_survey_responses" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON "no_show_follow_ups", "no_show_message_logs", "no_show_survey_responses" FROM anon, authenticated;
