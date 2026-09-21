import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "./client";
import { encryptSecret, decryptSecret } from "@/lib/crypto";
import type { WhatsAppConnection as PrismaConnection } from "@prisma/client";
import type { WhatsAppConnection } from "@/types";

function connectionTag(clinicId: string): string {
  return `whatsapp-connection-${clinicId}`;
}

// Secrets stay encrypted in the shape returned by toConnection() so that
// unstable_cache never persists them in plaintext; every caller-facing
// function passes the result through withDecryptedSecrets() AFTER the
// cache boundary.
function toConnection(row: PrismaConnection): WhatsAppConnection {
  return {
    clinicId: row.clinicId,
    status: row.status,
    phoneNumberId: row.phoneNumberId,
    accessToken: row.accessToken,
    appSecret: row.appSecret,
    wabaId: row.wabaId,
    phoneNumber: row.phoneNumber,
    connectedAt: row.connectedAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
    lastError: row.lastError,
  };
}

function withDecryptedSecrets(connection: WhatsAppConnection): WhatsAppConnection {
  return {
    ...connection,
    accessToken: decryptSecret(connection.accessToken),
    appSecret: decryptSecret(connection.appSecret),
  };
}

/** Used by the daily scheduled-messages cron to find every clinic it needs
 * to check — a small, infrequent (once/day) table scan, not a per-request
 * hot path, so it's left uncached. */
export async function listConnectedClinicIds(): Promise<string[]> {
  const rows = await prisma.whatsAppConnection.findMany({ where: { status: "connected" }, select: { clinicId: true } });
  return rows.map((r) => r.clinicId);
}

export async function getWhatsAppConnection(clinicId: string): Promise<WhatsAppConnection | null> {
  const cached = await unstable_cache(
    async () => {
      const row = await prisma.whatsAppConnection.findUnique({ where: { clinicId } });
      return row ? toConnection(row) : null;
    },
    ["whatsapp-connection", clinicId],
    { revalidate: 60, tags: [connectionTag(clinicId)] }
  )();
  return cached ? withDecryptedSecrets(cached) : null;
}

/** Used by the inbound webhook to find which clinic a message belongs to —
 * Meta's payload carries phoneNumberId, not clinicId. */
export async function getWhatsAppConnectionByPhoneNumberId(phoneNumberId: string): Promise<WhatsAppConnection | null> {
  const row = await prisma.whatsAppConnection.findFirst({ where: { phoneNumberId, status: "connected" } });
  return row ? withDecryptedSecrets(toConnection(row)) : null;
}

export interface SaveWhatsAppConnectionInput {
  phoneNumberId: string;
  accessToken?: string; // blank on edit = keep existing
  appSecret?: string; // blank on edit = keep existing
  wabaId: string;
  phoneNumber: string;
}

export async function saveWhatsAppConnection(clinicId: string, input: SaveWhatsAppConnectionInput): Promise<void> {
  const existing = await prisma.whatsAppConnection.findUnique({ where: { clinicId } });

  // A blank field on edit keeps the stored (already-encrypted) value as-is.
  const accessToken = input.accessToken ? encryptSecret(input.accessToken) : existing?.accessToken;
  const appSecret = input.appSecret ? encryptSecret(input.appSecret) : existing?.appSecret;
  if (!accessToken) throw new Error("Access token is required.");
  if (!appSecret) throw new Error("App secret is required.");

  const data = {
    status: "connected" as const,
    phoneNumberId: input.phoneNumberId,
    accessToken,
    appSecret,
    wabaId: input.wabaId,
    phoneNumber: input.phoneNumber,
    lastError: null,
  };
  await prisma.whatsAppConnection.upsert({
    where: { clinicId },
    create: { clinicId, ...data, connectedAt: new Date() },
    update: data,
  });
  revalidateTag(connectionTag(clinicId));
}

export async function disconnectWhatsApp(clinicId: string): Promise<void> {
  await prisma.whatsAppConnection.deleteMany({ where: { clinicId } });
  revalidateTag(connectionTag(clinicId));
}

/** Records the reason the most recent send/webhook-verify failed, surfaced
 * on the settings page so a wrong/expired token doesn't fail silently. */
export async function recordWhatsAppError(clinicId: string, message: string): Promise<void> {
  await prisma.whatsAppConnection.update({ where: { clinicId }, data: { lastError: message } });
  revalidateTag(connectionTag(clinicId));
}
