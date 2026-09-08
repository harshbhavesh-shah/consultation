"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import {
  saveWhatsAppConnection,
  disconnectWhatsApp,
  getWhatsAppConnection,
  type SaveWhatsAppConnectionInput,
} from "@/lib/firestore/whatsappConnections";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getTemplate,
  type TemplateInput,
} from "@/lib/firestore/messageTemplates";
import { activeProvider } from "@/lib/whatsapp/activeProvider";
import { toWhatsAppPhone, isValidPhone } from "@/lib/phone";

async function requireDoctor() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  if (session.role !== "doctor") throw new Error("Only the clinic owner can manage WhatsApp settings.");
  return session;
}

export async function connectWhatsAppAction(
  input: SaveWhatsAppConnectionInput
): Promise<{ error?: string }> {
  const session = await requireDoctor();
  if (!input.phoneNumberId.trim()) return { error: "Phone Number ID is required." };

  try {
    await saveWhatsAppConnection(session.clinicId, input);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Something went wrong saving your connection." };
  }

  revalidatePath("/dashboard/communication");
  return {};
}

export async function disconnectWhatsAppAction(): Promise<{ error?: string }> {
  const session = await requireDoctor();
  await disconnectWhatsApp(session.clinicId);
  revalidatePath("/dashboard/communication");
  return {};
}

// No live validation call happens on save (see WhatsAppSection.tsx) — a
// wrong token only surfaces on the first real send. This is that first
// real send, deliberately manual, so a clinic can confirm credentials work
// before any automated message goes out to a real patient.
export async function sendTestMessageAction(
  templateId: string,
  toPhone: string
): Promise<{ error?: string; success?: boolean }> {
  const session = await requireDoctor();
  if (!isValidPhone(toPhone)) return { error: "Enter a valid phone number." };

  const connection = await getWhatsAppConnection(session.clinicId);
  if (!connection) return { error: "Connect WhatsApp first." };

  const template = await getTemplate(session.clinicId, templateId);
  if (!template) return { error: "Template not found." };

  const placeholderParams = template.variableLabels.map((label) => `[${label}]`);

  try {
    await activeProvider.sendTemplateMessage(
      connection,
      toWhatsAppPhone(toPhone),
      template.name,
      placeholderParams,
      template.language
    );
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Send failed." };
  }
  return { success: true };
}

export async function createTemplateAction(input: TemplateInput): Promise<{ error?: string }> {
  const session = await requireDoctor();
  if (!input.name.trim()) return { error: "Template name is required." };
  await createTemplate(session.clinicId, input);
  revalidatePath("/dashboard/communication");
  return {};
}

export async function updateTemplateAction(id: string, input: TemplateInput): Promise<{ error?: string }> {
  const session = await requireDoctor();
  if (!input.name.trim()) return { error: "Template name is required." };
  await updateTemplate(session.clinicId, id, input);
  revalidatePath("/dashboard/communication");
  return {};
}

export async function deleteTemplateAction(id: string): Promise<{ error?: string }> {
  const session = await requireDoctor();
  await deleteTemplate(session.clinicId, id);
  revalidatePath("/dashboard/communication");
  return {};
}
