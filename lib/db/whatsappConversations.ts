import "server-only";
import { revalidateTag } from "next/cache";
import { prisma } from "./client";
import { normalizePhone } from "@/lib/phone";
import { findPatientsByPhone } from "@/lib/db/patients";
import type {
  WhatsAppConversation as PrismaConversation,
  WhatsAppMessage as PrismaMessage,
} from "@prisma/client";
import type { NormalizedInboundMessage } from "@/lib/whatsapp/types";
import type { WhatsAppConversation, WhatsAppMessage } from "@/types";

const MESSAGE_PREVIEW_LENGTH = 120;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function conversationTag(clinicId: string): string {
  return `whatsapp-conversations-${clinicId}`;
}

function toConversation(row: PrismaConversation): WhatsAppConversation {
  return {
    id: row.id,
    clinicId: row.clinicId,
    patientId: row.patientId,
    patientName: row.patientName,
    phoneNumber: row.phoneNumber,
    lastMessagePreview: row.lastMessagePreview,
    lastMessageAt: row.lastMessageAt.getTime(),
    unreadCount: row.unreadCount,
    updatedAt: row.updatedAt.getTime(),
  };
}

function toMessage(row: PrismaMessage): WhatsAppMessage {
  return {
    id: row.id,
    clinicId: row.clinicId,
    conversationId: row.conversationId,
    direction: row.direction,
    body: row.body,
    status: row.status,
    templateId: row.templateId,
    providerMessageId: row.providerMessageId,
    createdAt: row.createdAt.getTime(),
  };
}

// Was doc id `${clinicId}_${normalizePhone(phoneNumber)}` in Firestore, with
// the doc's own `phoneNumber` field kept as whatever raw format was last
// written — the @@unique([clinicId, phoneNumber]) constraint replaces that
// encoding, and phoneNumber is always stored normalized now (this app
// already stores every other phone number as bare digits — see
// lib/phone.ts — so in practice this was never actually storing a
// differently-formatted value; this just makes that consistent instead of
// leaving room for it to drift).
export async function getClinicConversations(clinicId: string): Promise<WhatsAppConversation[]> {
  const rows = await prisma.whatsAppConversation.findMany({
    where: { clinicId },
    orderBy: { lastMessageAt: "desc" },
  });
  return rows.map(toConversation);
}

export async function getConversation(clinicId: string, conversationId: string): Promise<WhatsAppConversation | null> {
  if (!UUID_RE.test(conversationId)) return null;
  const row = await prisma.whatsAppConversation.findUnique({ where: { id: conversationId } });
  if (!row || row.clinicId !== clinicId) return null;
  return toConversation(row);
}

export async function getConversationMessages(clinicId: string, conversationId: string): Promise<WhatsAppMessage[]> {
  const conversation = await getConversation(clinicId, conversationId);
  if (!conversation) return []; // tenant isolation — refuse to leak another clinic's thread

  const rows = await prisma.whatsAppMessage.findMany({
    where: { conversationId, clinicId },
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toMessage);
}

export async function markConversationRead(clinicId: string, conversationId: string): Promise<void> {
  const conversation = await getConversation(clinicId, conversationId);
  if (!conversation) return;
  await prisma.whatsAppConversation.updateMany({ where: { id: conversationId, clinicId }, data: { unreadCount: 0 } });
  revalidateTag(conversationTag(clinicId));
}

function preview(body: string): string {
  return body.length > MESSAGE_PREVIEW_LENGTH ? body.slice(0, MESSAGE_PREVIEW_LENGTH) + "…" : body;
}

/** Called from the webhook handler for every inbound message, once the
 * caller has already resolved which clinic (`clinicId`) this event belongs
 * to and verified the webhook signature. Upserts the conversation (creating
 * it on a patient's first-ever message), best-effort links it to a Patient
 * record by phone, bumps the unread count, and records the message. */
export async function recordInboundMessage(
  clinicId: string,
  event: NormalizedInboundMessage
): Promise<{ conversationId: string }> {
  const phoneNumber = normalizePhone(event.fromPhone);

  const [existing, patientMatches] = await Promise.all([
    prisma.whatsAppConversation.findUnique({ where: { clinicId_phoneNumber: { clinicId, phoneNumber } } }),
    findPatientsByPhone(clinicId, phoneNumber),
  ]);
  const patient = patientMatches[0] ?? null;
  const lastMessageAt = new Date(event.timestampMs);

  const conversation = await prisma.whatsAppConversation.upsert({
    where: { clinicId_phoneNumber: { clinicId, phoneNumber } },
    create: {
      clinicId,
      phoneNumber,
      patientId: patient?.id ?? null,
      patientName: patient?.name ?? null,
      lastMessagePreview: preview(event.body),
      lastMessageAt,
      unreadCount: 1,
    },
    update: {
      patientId: patient?.id ?? existing?.patientId ?? null,
      patientName: patient?.name ?? existing?.patientName ?? null,
      lastMessagePreview: preview(event.body),
      lastMessageAt,
      unreadCount: { increment: 1 },
    },
  });

  await prisma.whatsAppMessage.create({
    data: {
      clinicId,
      conversationId: conversation.id,
      direction: "inbound",
      body: event.body,
      status: "delivered",
      providerMessageId: event.providerMessageId,
      createdAt: lastMessageAt,
    },
  });

  revalidateTag(conversationTag(clinicId));
  return { conversationId: conversation.id };
}

/** Called after a successful outbound send (manual reply or automated
 * template). `phoneNumber` is required so a conversation can be created for
 * an automated send even if the patient never messaged first. */
export async function recordOutboundMessage(
  clinicId: string,
  phoneNumber: string,
  body: string,
  options: { templateId?: string; providerMessageId?: string; patientId?: string | null; patientName?: string | null } = {}
): Promise<void> {
  const normalizedPhone = normalizePhone(phoneNumber);
  const existing = await prisma.whatsAppConversation.findUnique({
    where: { clinicId_phoneNumber: { clinicId, phoneNumber: normalizedPhone } },
  });
  const now = new Date();

  const conversation = await prisma.whatsAppConversation.upsert({
    where: { clinicId_phoneNumber: { clinicId, phoneNumber: normalizedPhone } },
    create: {
      clinicId,
      phoneNumber: normalizedPhone,
      patientId: options.patientId ?? null,
      patientName: options.patientName ?? null,
      lastMessagePreview: preview(body),
      lastMessageAt: now,
      unreadCount: 0,
    },
    update: {
      patientId: options.patientId ?? existing?.patientId ?? null,
      patientName: options.patientName ?? existing?.patientName ?? null,
      lastMessagePreview: preview(body),
      lastMessageAt: now,
    },
  });

  await prisma.whatsAppMessage.create({
    data: {
      clinicId,
      conversationId: conversation.id,
      direction: "outbound",
      body,
      status: "sent",
      templateId: options.templateId ?? null,
      providerMessageId: options.providerMessageId ?? null,
      createdAt: now,
    },
  });

  revalidateTag(conversationTag(clinicId));
}
