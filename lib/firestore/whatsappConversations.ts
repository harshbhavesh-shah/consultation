import "server-only";
import { revalidateTag } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import { normalizePhone } from "@/lib/phone";
import { findPatientsByPhone } from "@/lib/firestore/patients";
import type { NormalizedInboundMessage } from "@/lib/whatsapp/types";
import type { MessageDeliveryStatus, WhatsAppConversation, WhatsAppMessage } from "@/types";

const COLLECTION = "whatsappConversations";
const MESSAGE_PREVIEW_LENGTH = 120;

export function conversationTag(clinicId: string): string {
  return `whatsapp-conversations-${clinicId}`;
}

function conversationDocId(clinicId: string, phoneNumber: string): string {
  return `${clinicId}_${normalizePhone(phoneNumber)}`;
}

function toConversation(doc: FirebaseFirestore.QueryDocumentSnapshot): WhatsAppConversation {
  const data = doc.data();
  return {
    id: doc.id,
    clinicId: data.clinicId,
    patientId: data.patientId ?? null,
    patientName: data.patientName ?? null,
    phoneNumber: data.phoneNumber,
    lastMessagePreview: data.lastMessagePreview ?? "",
    lastMessageAt: data.lastMessageAt,
    unreadCount: data.unreadCount ?? 0,
    updatedAt: data.updatedAt,
  };
}

function toMessage(doc: FirebaseFirestore.QueryDocumentSnapshot): WhatsAppMessage {
  const data = doc.data();
  return {
    id: doc.id,
    clinicId: data.clinicId,
    conversationId: data.conversationId,
    direction: data.direction,
    body: data.body,
    status: data.status,
    templateId: data.templateId ?? null,
    providerMessageId: data.providerMessageId ?? null,
    createdAt: data.createdAt,
  };
}

// Not cached — this is the Inbox's live list, kept fresh either by the
// client-side Firestore listener (see components/inbox/InboxClient.tsx) or
// by the server-rendered initial fetch on page load.
export async function getClinicConversations(clinicId: string): Promise<WhatsAppConversation[]> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .where("clinicId", "==", clinicId)
    .orderBy("lastMessageAt", "desc")
    .get();
  return snap.docs.map(toConversation);
}

export async function getConversation(clinicId: string, conversationId: string): Promise<WhatsAppConversation | null> {
  const doc = await adminDb().collection(COLLECTION).doc(conversationId).get();
  if (!doc.exists || doc.data()?.clinicId !== clinicId) return null;
  return toConversation(doc as FirebaseFirestore.QueryDocumentSnapshot);
}

export async function getConversationMessages(
  clinicId: string,
  conversationId: string
): Promise<WhatsAppMessage[]> {
  const conversation = await getConversation(clinicId, conversationId);
  if (!conversation) return []; // tenant isolation — refuse to leak another clinic's thread

  const snap = await adminDb()
    .collection(COLLECTION)
    .doc(conversationId)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .get();
  return snap.docs.map(toMessage);
}

export async function markConversationRead(clinicId: string, conversationId: string): Promise<void> {
  const ref = adminDb().collection(COLLECTION).doc(conversationId);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.clinicId !== clinicId) return;
  await ref.update({ unreadCount: 0 });
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
  const conversationId = conversationDocId(clinicId, event.fromPhone);
  const conversationRef = adminDb().collection(COLLECTION).doc(conversationId);

  const [existingDoc, patientMatches] = await Promise.all([
    conversationRef.get(),
    findPatientsByPhone(clinicId, normalizePhone(event.fromPhone)),
  ]);
  const patient = patientMatches[0] ?? null;
  const now = Date.now();

  await conversationRef.set(
    {
      clinicId,
      phoneNumber: event.fromPhone,
      patientId: patient?.id ?? existingDoc.data()?.patientId ?? null,
      patientName: patient?.name ?? existingDoc.data()?.patientName ?? null,
      lastMessagePreview: preview(event.body),
      lastMessageAt: event.timestampMs,
      unreadCount: ((existingDoc.data()?.unreadCount as number | undefined) ?? 0) + 1,
      updatedAt: now,
    },
    { merge: true }
  );

  await conversationRef.collection("messages").add({
    clinicId,
    conversationId,
    direction: "inbound",
    body: event.body,
    status: "delivered" satisfies MessageDeliveryStatus,
    templateId: null,
    providerMessageId: event.providerMessageId,
    createdAt: event.timestampMs,
  });

  revalidateTag(conversationTag(clinicId));
  return { conversationId };
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
  const conversationId = conversationDocId(clinicId, phoneNumber);
  const conversationRef = adminDb().collection(COLLECTION).doc(conversationId);
  const existingDoc = await conversationRef.get();
  const now = Date.now();

  await conversationRef.set(
    {
      clinicId,
      phoneNumber,
      patientId: options.patientId ?? existingDoc.data()?.patientId ?? null,
      patientName: options.patientName ?? existingDoc.data()?.patientName ?? null,
      lastMessagePreview: preview(body),
      lastMessageAt: now,
      unreadCount: existingDoc.data()?.unreadCount ?? 0,
      updatedAt: now,
    },
    { merge: true }
  );

  await conversationRef.collection("messages").add({
    clinicId,
    conversationId,
    direction: "outbound",
    body,
    status: "sent" satisfies MessageDeliveryStatus,
    templateId: options.templateId ?? null,
    providerMessageId: options.providerMessageId ?? null,
    createdAt: now,
  });

  revalidateTag(conversationTag(clinicId));
}
