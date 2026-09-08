import "server-only";
import { activeProvider } from "@/lib/whatsapp/activeProvider";
import { getWhatsAppConnection, recordWhatsAppError } from "@/lib/firestore/whatsappConnections";
import { getTemplateByCategory } from "@/lib/firestore/messageTemplates";
import { recordOutboundMessage } from "@/lib/firestore/whatsappConversations";
import { toWhatsAppPhone } from "@/lib/phone";
import type { MessageTemplate, MessageTemplateCategory } from "@/types";

export interface AutomatedSendInput {
  clinicId: string;
  category: MessageTemplateCategory;
  toPhone: string;
  params: string[];
  patientId?: string | null;
  patientName?: string | null;
}

export interface AutomatedSendResult {
  sent: boolean;
  reason?: string;
}

function renderPreview(template: MessageTemplate, params: string[]): string {
  if (!template.bodyPreview) return `[${template.name}] ` + params.filter(Boolean).join(" · ");
  return template.bodyPreview.replace(/\{\{(\d+)\}\}/g, (_match, n) => params[Number(n) - 1] ?? "");
}

/** Best-effort send: never throws. Every automated trigger (booking,
 * payment, the reminder/no-show/feedback cron) calls this and treats a
 * failure — WhatsApp not connected, no matching template, Meta rejecting
 * the send — as "nothing sent," never as a reason to fail the underlying
 * clinic operation (booking an appointment, marking a visit done). */
export async function sendAutomatedTemplate(input: AutomatedSendInput): Promise<AutomatedSendResult> {
  const connection = await getWhatsAppConnection(input.clinicId);
  if (!connection) return { sent: false, reason: "not-connected" };

  const template = await getTemplateByCategory(input.clinicId, input.category);
  if (!template) return { sent: false, reason: `no-template:${input.category}` };

  const toPhone = toWhatsAppPhone(input.toPhone);
  try {
    const result = await activeProvider.sendTemplateMessage(
      connection,
      toPhone,
      template.name,
      input.params,
      template.language
    );
    await recordOutboundMessage(input.clinicId, input.toPhone, renderPreview(template, input.params), {
      templateId: template.id,
      providerMessageId: result.providerMessageId,
      patientId: input.patientId ?? null,
      patientName: input.patientName ?? null,
    });
    return { sent: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown WhatsApp send error";
    await recordWhatsAppError(input.clinicId, message).catch(() => {});
    return { sent: false, reason: message };
  }
}
