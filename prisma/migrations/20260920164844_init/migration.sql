-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('reception', 'doctor');

-- CreateEnum
CREATE TYPE "appointment_status" AS ENUM ('Booked', 'Visited', 'Cancelled');

-- CreateEnum
CREATE TYPE "entry_source" AS ENUM ('online', 'walkin');

-- CreateEnum
CREATE TYPE "payment_type" AS ENUM ('Cash', 'Online');

-- CreateEnum
CREATE TYPE "age_unit" AS ENUM ('years', 'months');

-- CreateEnum
CREATE TYPE "gender" AS ENUM ('Male', 'Female', 'Other');

-- CreateEnum
CREATE TYPE "shift" AS ENUM ('morning', 'afternoon');

-- CreateEnum
CREATE TYPE "whatsapp_connection_status" AS ENUM ('connected', 'error');

-- CreateEnum
CREATE TYPE "message_template_category" AS ENUM ('appointment_confirmation', 'appointment_reminder', 'receipt_sent', 'no_show_followup', 'visit_feedback', 'custom');

-- CreateEnum
CREATE TYPE "message_direction" AS ENUM ('inbound', 'outbound');

-- CreateEnum
CREATE TYPE "message_delivery_status" AS ENUM ('queued', 'sent', 'delivered', 'read', 'failed');

-- CreateTable
CREATE TABLE "clinics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" UUID NOT NULL,
    "clinic_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "patient_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL DEFAULT '',
    "age" INTEGER,
    "age_unit" "age_unit" NOT NULL DEFAULT 'years',
    "gender" "gender",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "appointment_date" TEXT NOT NULL,
    "appointment_time" TEXT NOT NULL,
    "status" "appointment_status" NOT NULL,
    "entry_source" "entry_source" NOT NULL,
    "token_number" INTEGER NOT NULL,
    "shift" "shift" NOT NULL,
    "patient_id" UUID,
    "patient_name" TEXT NOT NULL,
    "patient_phone" TEXT NOT NULL,
    "patient_address" TEXT NOT NULL DEFAULT '',
    "age" INTEGER,
    "age_unit" "age_unit" NOT NULL DEFAULT 'years',
    "gender" "gender",
    "payment" DECIMAL(10,2),
    "payment_type" "payment_type",
    "reference" TEXT NOT NULL DEFAULT '',
    "diagnosis" TEXT NOT NULL DEFAULT '',
    "follow_up" INTEGER,
    "follow_up_sent" BOOLEAN NOT NULL DEFAULT false,
    "follow_up_day_before_sent" BOOLEAN NOT NULL DEFAULT false,
    "call_back" INTEGER,
    "call_back_due_date" TEXT,
    "call_back_completed_at" TIMESTAMP(3),
    "receipt_sent" BOOLEAN NOT NULL DEFAULT false,
    "no_show_sent" BOOLEAN NOT NULL DEFAULT false,
    "feedback_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" UUID NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "staff_uid" UUID NOT NULL,
    "staff_name" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "clock_in" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availability" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "date" TEXT NOT NULL,
    "unavailable" BOOLEAN NOT NULL DEFAULT false,
    "morning_start" TEXT NOT NULL DEFAULT '',
    "morning_end" TEXT NOT NULL DEFAULT '',
    "evening_start" TEXT NOT NULL DEFAULT '',
    "evening_end" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_deposits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "updated_by" UUID NOT NULL,

    CONSTRAINT "cash_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_connections" (
    "clinic_id" UUID NOT NULL,
    "status" "whatsapp_connection_status" NOT NULL,
    "phone_number_id" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "app_secret" TEXT NOT NULL,
    "waba_id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "connected_at" TIMESTAMP(3) NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_error" TEXT,

    CONSTRAINT "whatsapp_connections_pkey" PRIMARY KEY ("clinic_id")
);

-- CreateTable
CREATE TABLE "message_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "category" "message_template_category" NOT NULL,
    "language" TEXT NOT NULL,
    "variable_labels" TEXT[],
    "body_preview" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "message_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "patient_id" UUID,
    "patient_name" TEXT,
    "phone_number" TEXT NOT NULL,
    "last_message_preview" TEXT NOT NULL DEFAULT '',
    "last_message_at" TIMESTAMP(3) NOT NULL,
    "unread_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "whatsapp_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "clinic_id" UUID NOT NULL,
    "conversation_id" UUID NOT NULL,
    "direction" "message_direction" NOT NULL,
    "body" TEXT NOT NULL,
    "status" "message_delivery_status" NOT NULL,
    "template_id" UUID,
    "provider_message_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "whatsapp_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "staff_clinic_id_idx" ON "staff"("clinic_id");

-- CreateIndex
CREATE INDEX "patients_clinic_id_created_at_idx" ON "patients"("clinic_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "patients_clinic_id_phone_idx" ON "patients"("clinic_id", "phone");

-- CreateIndex
CREATE INDEX "patients_clinic_id_name_idx" ON "patients"("clinic_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "patients_clinic_id_patient_code_key" ON "patients"("clinic_id", "patient_code");

-- CreateIndex
CREATE INDEX "appointments_clinic_id_appointment_date_appointment_time_idx" ON "appointments"("clinic_id", "appointment_date", "appointment_time");

-- CreateIndex
CREATE INDEX "appointments_clinic_id_appointment_date_idx" ON "appointments"("clinic_id", "appointment_date");

-- CreateIndex
CREATE INDEX "appointments_clinic_id_patient_phone_created_at_idx" ON "appointments"("clinic_id", "patient_phone", "created_at" DESC);

-- CreateIndex
CREATE INDEX "appointments_clinic_id_call_back_due_date_idx" ON "appointments"("clinic_id", "call_back_due_date");

-- CreateIndex
CREATE INDEX "appointments_clinic_id_patient_id_idx" ON "appointments"("clinic_id", "patient_id");

-- CreateIndex
CREATE INDEX "attendance_clinic_id_date_idx" ON "attendance"("clinic_id", "date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_staff_uid_date_key" ON "attendance"("staff_uid", "date");

-- CreateIndex
CREATE UNIQUE INDEX "availability_clinic_id_date_key" ON "availability"("clinic_id", "date");

-- CreateIndex
CREATE UNIQUE INDEX "cash_deposits_clinic_id_period_key" ON "cash_deposits"("clinic_id", "period");

-- CreateIndex
CREATE INDEX "message_templates_clinic_id_idx" ON "message_templates"("clinic_id");

-- CreateIndex
CREATE INDEX "whatsapp_conversations_clinic_id_last_message_at_idx" ON "whatsapp_conversations"("clinic_id", "last_message_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "whatsapp_conversations_clinic_id_phone_number_key" ON "whatsapp_conversations"("clinic_id", "phone_number");

-- CreateIndex
CREATE INDEX "whatsapp_messages_conversation_id_created_at_idx" ON "whatsapp_messages"("conversation_id", "created_at" ASC);

-- CreateIndex
CREATE INDEX "whatsapp_messages_clinic_id_idx" ON "whatsapp_messages"("clinic_id");

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_staff_uid_fkey" FOREIGN KEY ("staff_uid") REFERENCES "staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availability" ADD CONSTRAINT "availability_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_deposits" ADD CONSTRAINT "cash_deposits_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_connections" ADD CONSTRAINT "whatsapp_connections_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_templates" ADD CONSTRAINT "message_templates_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_conversations" ADD CONSTRAINT "whatsapp_conversations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "whatsapp_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "whatsapp_messages" ADD CONSTRAINT "whatsapp_messages_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "message_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;
