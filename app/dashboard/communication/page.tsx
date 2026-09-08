import { getSession } from "@/lib/session";
import { getWhatsAppConnection } from "@/lib/firestore/whatsappConnections";
import { listTemplates } from "@/lib/firestore/messageTemplates";
import WhatsAppSection from "@/components/communication/WhatsAppSection";
import WebhookInfoSection from "@/components/communication/WebhookInfoSection";
import MessageTemplatesSection from "@/components/communication/MessageTemplatesSection";

export default async function CommunicationPage() {
  const session = await getSession();
  if (!session) return null;

  if (session.role !== "doctor") {
    return (
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Communication</p>
        <h1 className="mt-1 font-display text-2xl text-brown-900">WhatsApp Messaging</h1>
        <div className="mt-6 rounded-xl bg-surface p-6 text-sm text-brown-600 shadow-soft ring-1 ring-beige-300">
          Only the clinic owner can manage WhatsApp settings.
        </div>
      </div>
    );
  }

  const [connection, templates] = await Promise.all([
    getWhatsAppConnection(session.clinicId),
    listTemplates(session.clinicId),
  ]);

  return (
    <div className="mx-auto max-w-2xl">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Communication</p>
      <h1 className="mt-1 font-display text-2xl text-brown-900">WhatsApp Messaging</h1>

      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown-400">Connection</h2>
        <WhatsAppSection connection={connection} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown-400">Webhook</h2>
        <WebhookInfoSection verifyToken={process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? ""} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-brown-400">Message Templates</h2>
        <MessageTemplatesSection templates={templates} hasConnection={!!connection} />
      </div>
    </div>
  );
}
