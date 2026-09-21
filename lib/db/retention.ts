import "server-only";
import { randomBytes } from "crypto";
import { revalidateTag } from "next/cache";
import { prisma } from "./client";
import { isNoShowReason } from "@/lib/retention";
import type {
  NoShowFollowUp as PrismaFollowUp,
  NoShowSurveyResponse as PrismaSurvey,
} from "@prisma/client";
import type {
  NoShowFollowUp,
  NoShowFollowUpKind,
  NoShowMessageLogEntry,
  NoShowReason,
  NoShowSurveyResponse,
} from "@/types";

// ---------------------------------------------------------------------------
// No-show follow-ups (configuration)
// ---------------------------------------------------------------------------

function toFollowUp(row: PrismaFollowUp): NoShowFollowUp {
  return {
    id: row.id,
    clinicId: row.clinicId,
    name: row.name,
    kind: row.kind,
    templateId: row.templateId,
    ...(row.offerText ? { offerText: row.offerText } : {}),
    enabled: row.enabled,
    delayHours: row.delayHours,
    createdAt: row.createdAt.getTime(),
  };
}

export async function listNoShowFollowUps(clinicId: string): Promise<NoShowFollowUp[]> {
  const rows = await prisma.noShowFollowUp.findMany({ where: { clinicId }, orderBy: { createdAt: "asc" } });
  return rows.map(toFollowUp);
}

/** Enabled follow-ups with the timestamp they were switched on, for the
 * scheduler (which must only message appointments scheduled after it). */
export async function listEnabledFollowUpsWithSince(
  clinicId: string
): Promise<(NoShowFollowUp & { enabledSince: number })[]> {
  const rows = await prisma.noShowFollowUp.findMany({ where: { clinicId, enabled: true } });
  return rows.map((r) => ({ ...toFollowUp(r), enabledSince: (r.enabledSince ?? r.createdAt).getTime() }));
}

export interface NoShowFollowUpInput {
  name: string;
  kind: NoShowFollowUpKind;
  templateId: string;
  offerText?: string;
  enabled: boolean;
  delayHours: number;
}

/** The template must belong to this clinic and be a no_show_followup one —
 * a follow-up must never send another clinic's template. */
async function assertTemplateUsable(clinicId: string, templateId: string): Promise<void> {
  const template = await prisma.messageTemplate.findFirst({
    where: { id: templateId, clinicId, category: "no_show_followup" },
    select: { id: true },
  });
  if (!template) throw new Error("Choose one of your no-show follow-up templates.");
}

export async function createNoShowFollowUp(clinicId: string, input: NoShowFollowUpInput): Promise<NoShowFollowUp> {
  await assertTemplateUsable(clinicId, input.templateId);
  const row = await prisma.noShowFollowUp.create({
    data: {
      clinicId,
      name: input.name,
      kind: input.kind,
      templateId: input.templateId,
      offerText: input.offerText ?? null,
      enabled: input.enabled,
      enabledSince: input.enabled ? new Date() : null,
      delayHours: input.delayHours,
    },
  });
  return toFollowUp(row);
}

export async function updateNoShowFollowUp(
  clinicId: string,
  id: string,
  input: NoShowFollowUpInput
): Promise<NoShowFollowUp> {
  const existing = await prisma.noShowFollowUp.findFirst({ where: { id, clinicId } });
  if (!existing) throw new Error("Follow-up not found.");
  await assertTemplateUsable(clinicId, input.templateId);

  // Switching on (false -> true) restarts the clock, so only appointments
  // scheduled from now on are messaged, never a backlog.
  const turningOn = input.enabled && !existing.enabled;
  await prisma.noShowFollowUp.updateMany({
    where: { id, clinicId },
    data: {
      name: input.name,
      kind: input.kind,
      templateId: input.templateId,
      offerText: input.offerText ?? null,
      enabled: input.enabled,
      ...(turningOn ? { enabledSince: new Date() } : {}),
      delayHours: input.delayHours,
    },
  });
  const row = await prisma.noShowFollowUp.findFirstOrThrow({ where: { id, clinicId } });
  return toFollowUp(row);
}

export async function deleteNoShowFollowUp(clinicId: string, id: string): Promise<void> {
  const { count } = await prisma.noShowFollowUp.deleteMany({ where: { id, clinicId } });
  if (count === 0) throw new Error("Follow-up not found.");
}

// ---------------------------------------------------------------------------
// Send log
// ---------------------------------------------------------------------------

export async function hasFollowUpBeenSent(appointmentId: string, followUpId: string): Promise<boolean> {
  const row = await prisma.noShowMessageLog.findUnique({
    where: { appointmentId_followUpId: { appointmentId, followUpId } },
    select: { id: true },
  });
  return !!row;
}

export async function logFollowUpSent(input: {
  clinicId: string;
  appointmentId: string;
  followUpId: string;
  followUpName: string;
}): Promise<void> {
  // The unique (appointment, follow-up) key means a racing second poll
  // simply fails this insert instead of double-logging.
  await prisma.noShowMessageLog.create({ data: input }).catch(() => {});
}

export async function listRecentFollowUpLog(clinicId: string, limit = 50): Promise<NoShowMessageLogEntry[]> {
  const rows = await prisma.noShowMessageLog.findMany({
    where: { clinicId },
    orderBy: { sentAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    appointmentId: r.appointmentId,
    followUpName: r.followUpName,
    sentAt: r.sentAt.getTime(),
  }));
}

// ---------------------------------------------------------------------------
// Survey ("why didn't you come in")
// ---------------------------------------------------------------------------

function toSurvey(row: PrismaSurvey): NoShowSurveyResponse {
  return {
    id: row.id,
    clinicId: row.clinicId,
    appointmentId: row.appointmentId,
    token: row.token,
    ...(row.reason && isNoShowReason(row.reason) ? { reason: row.reason } : {}),
    ...(row.comment ? { comment: row.comment } : {}),
    ...(row.sentAt ? { sentAt: row.sentAt.getTime() } : {}),
    ...(row.respondedAt ? { respondedAt: row.respondedAt.getTime() } : {}),
    createdAt: row.createdAt.getTime(),
  };
}

function generateToken(): string {
  return randomBytes(24).toString("base64url");
}

/** One survey per appointment. Idempotent: if an earlier poll created the
 * row and then failed before sending, the next attempt reuses it instead of
 * hitting the unique constraint forever. */
export async function getOrCreateSurvey(clinicId: string, appointmentId: string): Promise<NoShowSurveyResponse> {
  const existing = await prisma.noShowSurveyResponse.findUnique({ where: { appointmentId } });
  if (existing) return toSurvey(existing);
  try {
    const row = await prisma.noShowSurveyResponse.create({
      data: { clinicId, appointmentId, token: generateToken() },
    });
    return toSurvey(row);
  } catch {
    const raced = await prisma.noShowSurveyResponse.findUniqueOrThrow({ where: { appointmentId } });
    return toSurvey(raced);
  }
}

export async function markSurveySent(id: string): Promise<void> {
  await prisma.noShowSurveyResponse.updateMany({ where: { id }, data: { sentAt: new Date() } });
}

/** Remove a survey whose message failed to send (only if it never went
 * out), so a retry starts clean. */
export async function deleteUnsentSurvey(id: string): Promise<void> {
  await prisma.noShowSurveyResponse.deleteMany({ where: { id, sentAt: null, respondedAt: null } });
}

export interface PublicSurvey {
  survey: NoShowSurveyResponse;
  clinicName: string;
  firstName: string;
}

/** For the public page: only what it needs to show — the clinic's name and
 * the patient's first name. */
export async function getSurveyByToken(token: string): Promise<PublicSurvey | null> {
  if (!token || token.length > 100) return null;
  const row = await prisma.noShowSurveyResponse.findUnique({
    where: { token },
    include: { appointment: { select: { patientName: true } }, clinic: { select: { name: true } } },
  });
  if (!row) return null;
  return {
    survey: toSurvey(row),
    clinicName: row.clinic.name,
    firstName: row.appointment.patientName.trim().split(/\s+/)[0] ?? "",
  };
}

export async function submitSurvey(
  token: string,
  reason: NoShowReason,
  comment: string
): Promise<"ok" | "not-found" | "already-answered"> {
  const row = await prisma.noShowSurveyResponse.findUnique({ where: { token }, select: { id: true, respondedAt: true } });
  if (!row) return "not-found";
  if (row.respondedAt) return "already-answered";
  // Guarded write: only the first answer wins even if two arrive together.
  const { count } = await prisma.noShowSurveyResponse.updateMany({
    where: { id: row.id, respondedAt: null },
    data: { reason, comment: comment.trim().slice(0, 1000) || null, respondedAt: new Date() },
  });
  return count === 1 ? "ok" : "already-answered";
}

export interface SurveyResultRow extends NoShowSurveyResponse {
  patientName: string;
  appointmentDate: string;
}

export async function listSurveyResults(clinicId: string, limit = 50): Promise<SurveyResultRow[]> {
  const rows = await prisma.noShowSurveyResponse.findMany({
    where: { clinicId, respondedAt: { not: null } },
    orderBy: { respondedAt: "desc" },
    take: limit,
    include: { appointment: { select: { patientName: true, appointmentDate: true } } },
  });
  return rows.map((r) => ({
    ...toSurvey(r),
    patientName: r.appointment.patientName,
    appointmentDate: r.appointment.appointmentDate,
  }));
}

// ---------------------------------------------------------------------------
// No-show detection
// ---------------------------------------------------------------------------

/**
 * Flips every clinic's still-"Booked" appointments from a PAST date to
 * "NoShow" (the next-morning rule: a patient can wait in the queue for
 * hours, so nothing is flagged on the day itself). An appointment that shows
 * signs of having happened — a payment or a diagnosis recorded — is left
 * alone: someone forgot to press "Mark as done", and telling that patient
 * "we missed you" would be wrong. Returns how many were flipped.
 */
export async function detectNoShows(today: string): Promise<number> {
  const stale = await prisma.appointment.findMany({
    where: {
      status: "Booked",
      appointmentDate: { lt: today },
      diagnosis: "",
      OR: [{ payment: null }, { payment: 0 }],
    },
    select: { id: true, clinicId: true },
  });
  if (stale.length === 0) return 0;

  const { count } = await prisma.appointment.updateMany({
    where: { id: { in: stale.map((a) => a.id) }, status: "Booked" },
    data: { status: "NoShow" },
  });
  for (const clinicId of Array.from(new Set(stale.map((a) => a.clinicId)))) {
    revalidateTag(`appointments-${clinicId}`);
  }
  return count;
}
