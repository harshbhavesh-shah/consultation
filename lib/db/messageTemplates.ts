import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { prisma } from "./client";
import type { MessageTemplate as PrismaTemplate } from "@prisma/client";
import type { MessageTemplate, MessageTemplateCategory } from "@/types";

function templatesTag(clinicId: string): string {
  return `message-templates-${clinicId}`;
}

function toTemplate(row: PrismaTemplate): MessageTemplate {
  return {
    id: row.id,
    clinicId: row.clinicId,
    name: row.name,
    category: row.category,
    language: row.language,
    variableLabels: row.variableLabels,
    bodyPreview: row.bodyPreview,
    createdAt: row.createdAt.getTime(),
    updatedAt: row.updatedAt.getTime(),
  };
}

// Low-volume, per-clinic table — sorted here rather than needing a
// composite index for it, same as the Firestore version this replaces.
export async function listTemplates(clinicId: string): Promise<MessageTemplate[]> {
  return unstable_cache(
    async () => {
      const rows = await prisma.messageTemplate.findMany({ where: { clinicId }, orderBy: { createdAt: "desc" } });
      return rows.map(toTemplate);
    },
    ["message-templates", clinicId],
    { revalidate: 120, tags: [templatesTag(clinicId)] }
  )();
}

export async function getTemplate(clinicId: string, id: string): Promise<MessageTemplate | null> {
  const row = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!row || row.clinicId !== clinicId) return null;
  return toTemplate(row);
}

/** The one used by each automated trigger for a given category — "the
 * newest template of this category" so staff can replace one without
 * having to also delete the old one. */
export async function getTemplateByCategory(
  clinicId: string,
  category: MessageTemplateCategory
): Promise<MessageTemplate | null> {
  const all = await listTemplates(clinicId);
  return all.find((t) => t.category === category) ?? null;
}

export interface TemplateInput {
  name: string;
  category: MessageTemplateCategory;
  language: string;
  variableLabels: string[];
  bodyPreview: string;
}

export async function createTemplate(clinicId: string, input: TemplateInput): Promise<string> {
  const row = await prisma.messageTemplate.create({ data: { clinicId, ...input } });
  revalidateTag(templatesTag(clinicId));
  return row.id;
}

export async function updateTemplate(clinicId: string, id: string, input: TemplateInput): Promise<void> {
  const existing = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!existing || existing.clinicId !== clinicId) throw new Error("Template not found");
  await prisma.messageTemplate.update({ where: { id }, data: input });
  revalidateTag(templatesTag(clinicId));
}

export async function deleteTemplate(clinicId: string, id: string): Promise<void> {
  const existing = await prisma.messageTemplate.findUnique({ where: { id } });
  if (!existing || existing.clinicId !== clinicId) throw new Error("Template not found");
  await prisma.messageTemplate.delete({ where: { id } });
  revalidateTag(templatesTag(clinicId));
}
