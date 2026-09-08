import "server-only";
import { unstable_cache, revalidateTag } from "next/cache";
import { adminDb } from "@/lib/firebase/admin";
import type { MessageTemplate, MessageTemplateCategory } from "@/types";

const COLLECTION = "messageTemplates";

function templatesTag(clinicId: string): string {
  return `message-templates-${clinicId}`;
}

function toTemplate(doc: FirebaseFirestore.QueryDocumentSnapshot): MessageTemplate {
  const data = doc.data();
  return {
    id: doc.id,
    clinicId: data.clinicId,
    name: data.name,
    category: data.category,
    language: data.language,
    variableLabels: data.variableLabels ?? [],
    bodyPreview: data.bodyPreview ?? "",
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  };
}

// Low-volume, per-clinic collection — sorted client-side rather than via an
// indexed orderBy, same as the reference implementation this was ported
// from, so no composite index is needed for it.
export async function listTemplates(clinicId: string): Promise<MessageTemplate[]> {
  return unstable_cache(
    async () => {
      const snap = await adminDb().collection(COLLECTION).where("clinicId", "==", clinicId).get();
      return snap.docs.map(toTemplate).sort((a, b) => b.createdAt - a.createdAt);
    },
    ["message-templates", clinicId],
    { revalidate: 120, tags: [templatesTag(clinicId)] }
  )();
}

export async function getTemplate(clinicId: string, id: string): Promise<MessageTemplate | null> {
  const doc = await adminDb().collection(COLLECTION).doc(id).get();
  if (!doc.exists || doc.data()?.clinicId !== clinicId) return null;
  return toTemplate(doc as FirebaseFirestore.QueryDocumentSnapshot);
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
  const ref = adminDb().collection(COLLECTION).doc();
  const now = Date.now();
  await ref.set({ clinicId, ...input, createdAt: now, updatedAt: now });
  revalidateTag(templatesTag(clinicId));
  return ref.id;
}

export async function updateTemplate(clinicId: string, id: string, input: TemplateInput): Promise<void> {
  const ref = adminDb().collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.clinicId !== clinicId) throw new Error("Template not found");
  await ref.update({ ...input, updatedAt: Date.now() });
  revalidateTag(templatesTag(clinicId));
}

export async function deleteTemplate(clinicId: string, id: string): Promise<void> {
  const ref = adminDb().collection(COLLECTION).doc(id);
  const doc = await ref.get();
  if (!doc.exists || doc.data()?.clinicId !== clinicId) throw new Error("Template not found");
  await ref.delete();
  revalidateTag(templatesTag(clinicId));
}
