import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "./client";
import type { Session } from "@/types";

// Backs CERT-In's ICT-log retention requirement and DPDP breach scoping.
// Every write is fire-and-forget from the caller's point of view (failures
// are logged, never thrown) so a logging hiccup can never block the
// patient-care action it records. Never put patient names, phone numbers
// or diagnoses in `metadata` — reference records by id only, so the log
// itself doesn't become another copy of the sensitive data.

export interface AuditEvent {
  action: string;
  targetType: string;
  targetId: string;
  metadata?: Record<string, unknown>;
}

export interface AuditLogEntry {
  id: string;
  clinicId: string;
  actorUid: string;
  actorName: string;
  actorRole: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: number;
}

/** Call right after the mutation (or read) it describes succeeds. */
export async function recordAuditEvent(session: Session, event: AuditEvent): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        clinicId: session.clinicId,
        actorUid: session.uid,
        actorName: session.email ?? session.uid,
        actorRole: session.role,
        action: event.action,
        targetType: event.targetType,
        targetId: event.targetId,
        metadata: (event.metadata as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (err) {
    console.error("Failed to record audit event:", event.action, err);
  }
}

function toEntry(row: Prisma.AuditLogGetPayload<object>): AuditLogEntry {
  return {
    id: row.id,
    clinicId: row.clinicId,
    actorUid: row.actorUid,
    actorName: row.actorName,
    actorRole: row.actorRole,
    action: row.action,
    targetType: row.targetType,
    targetId: row.targetId,
    metadata: (row.metadata as Record<string, unknown> | null) ?? null,
    createdAt: row.createdAt.getTime(),
  };
}

/** Recent history for a clinic, newest first. */
export async function getAuditLogs(clinicId: string, opts: { limit?: number } = {}): Promise<AuditLogEntry[]> {
  const rows = await prisma.auditLog.findMany({
    where: { clinicId },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 200,
  });
  return rows.map(toEntry);
}

/** Every event touching one record — breach scoping and erasure requests. */
export async function getAuditLogsForTarget(
  clinicId: string,
  targetType: string,
  targetId: string
): Promise<AuditLogEntry[]> {
  const rows = await prisma.auditLog.findMany({
    where: { clinicId, targetType, targetId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toEntry);
}
