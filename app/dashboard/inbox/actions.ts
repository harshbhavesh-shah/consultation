"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { getWhatsAppConnection } from "@/lib/firestore/whatsappConnections";
import {
  getConversation,
  getConversationMessages,
  recordOutboundMessage,
  markConversationRead,
} from "@/lib/firestore/whatsappConversations";
import { activeProvider } from "@/lib/whatsapp/activeProvider";
import { toWhatsAppPhone } from "@/lib/phone";
import type { WhatsAppMessage } from "@/types";

async function requireSession() {
  const session = await getSession();
  if (!session) throw new Error("Not signed in.");
  return session;
}

export async function loadConversationMessagesAction(conversationId: string): Promise<WhatsAppMessage[]> {
  const session = await requireSession();
  return getConversationMessages(session.clinicId, conversationId);
}

export async function markConversationReadAction(conversationId: string): Promise<void> {
  const session = await requireSession();
  await markConversationRead(session.clinicId, conversationId);
}

export async function sendReplyAction(
  conversationId: string,
  text: string
): Promise<{ error?: string; message?: WhatsAppMessage }> {
  const session = await requireSession();
  const trimmed = text.trim();
  if (!trimmed) return { error: "Message can't be empty." };

  const connection = await getWhatsAppConnection(session.clinicId);
  if (!connection) return { error: "WhatsApp isn't connected. Set it up in Communication first." };

  const conversation = await getConversation(session.clinicId, conversationId);
  if (!conversation) return { error: "Conversation not found." };

  try {
    const result = await activeProvider.sendFreeText(connection, toWhatsAppPhone(conversation.phoneNumber), trimmed);
    await recordOutboundMessage(session.clinicId, conversation.phoneNumber, trimmed, {
      providerMessageId: result.providerMessageId,
      patientId: conversation.patientId,
      patientName: conversation.patientName,
    });
  } catch (err) {
    // Free-form replies are only deliverable inside WhatsApp's 24h window
    // opened by the patient's last inbound message — outside it, Meta
    // rejects the send and that error message is the useful one to surface.
    return { error: err instanceof Error ? err.message : "Send failed." };
  }

  revalidatePath("/dashboard/inbox");
  const messages = await getConversationMessages(session.clinicId, conversationId);
  return { message: messages[messages.length - 1] };
}
