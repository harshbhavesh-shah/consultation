import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import type { WhatsAppConnection } from "@/types";

// One doc per clinic, doc id == clinicId.
const COLLECTION = "whatsappConnections";

function connectionTag(clinicId: string): string {
  return `whatsapp-connection-${clinicId}`;
}

function toConnection(doc: FirebaseFirestore.DocumentSnapshot): WhatsAppConnection | null {
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    clinicId: doc.id,
    status: data.status,
    phoneNumberId: data.phoneNumberId,
    accessToken: data.accessToken ?? "",
    appSecret: data.appSecret ?? "",
    wabaId: data.wabaId ?? "",
    phoneNumber: data.phoneNumber ?? "",
    connectedAt: data.connectedAt ?? 0,
    updatedAt: data.updatedAt,
    lastError: data.lastError ?? null,
  };
}

/** Used by the daily scheduled-messages cron to find every clinic it needs
 * to check — a small, infrequent (once/day) collection scan, not a
 * per-request hot path, so it's left uncached. */
export async function listConnectedClinicIds(): Promise<string[]> {
  const snap = await adminDb().collection(COLLECTION).where("status", "==", "connected").get();
  return snap.docs.map((doc) => doc.id);
}

export async function getWhatsAppConnection(clinicId: string): Promise<WhatsAppConnection | null> {
  return unstable_cache(
    async () => toConnection(await adminDb().collection(COLLECTION).doc(clinicId).get()),
    ["whatsapp-connection", clinicId],
    { revalidate: 60, tags: [connectionTag(clinicId)] }
  )();
}

/** Used by the inbound webhook to find which clinic a message belongs to —
 * Meta's payload carries phoneNumberId, not clinicId. Two equality filters
 * don't need a composite index in Firestore. */
export async function getWhatsAppConnectionByPhoneNumberId(
  phoneNumberId: string
): Promise<WhatsAppConnection | null> {
  const snap = await adminDb()
    .collection(COLLECTION)
    .where("phoneNumberId", "==", phoneNumberId)
    .where("status", "==", "connected")
    .limit(1)
    .get();
  if (snap.empty) return null;
  return toConnection(snap.docs[0]);
}

export interface SaveWhatsAppConnectionInput {
  phoneNumberId: string;
  accessToken?: string; // blank on edit = keep existing
  appSecret?: string; // blank on edit = keep existing
  wabaId: string;
  phoneNumber: string;
}

export async function saveWhatsAppConnection(
  clinicId: string,
  input: SaveWhatsAppConnectionInput
): Promise<void> {
  const ref = adminDb().collection(COLLECTION).doc(clinicId);
  const existing = toConnection(await ref.get());

  const accessToken = input.accessToken || existing?.accessToken;
  const appSecret = input.appSecret || existing?.appSecret;
  if (!accessToken) throw new Error("Access token is required.");
  if (!appSecret) throw new Error("App secret is required.");

  await ref.set({
    status: "connected",
    phoneNumberId: input.phoneNumberId,
    accessToken,
    appSecret,
    wabaId: input.wabaId,
    phoneNumber: input.phoneNumber,
    connectedAt: existing?.connectedAt || Date.now(),
    updatedAt: Date.now(),
    lastError: null,
  });
  revalidateTag(connectionTag(clinicId));
}

export async function disconnectWhatsApp(clinicId: string): Promise<void> {
  await adminDb().collection(COLLECTION).doc(clinicId).delete();
  revalidateTag(connectionTag(clinicId));
}

/** Records the reason the most recent send/webhook-verify failed, surfaced
 * on the settings page so a wrong/expired token doesn't fail silently. */
export async function recordWhatsAppError(clinicId: string, message: string): Promise<void> {
  await adminDb().collection(COLLECTION).doc(clinicId).update({ lastError: message, updatedAt: Date.now() });
  revalidateTag(connectionTag(clinicId));
}
