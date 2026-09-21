import { getSession } from "@/lib/session";
import { getWhatsAppConnection } from "@/lib/db/whatsappConnections";
import { listTemplates } from "@/lib/db/messageTemplates";
import WhatsAppSection from "@/components/communication/WhatsAppSection";
import WebhookInfoSection from "@/components/communication/WebhookInfoSection";
import MessageTemplatesSection from "@/components/communication/MessageTemplatesSection";
import SetupStepsNav, { type SetupStep } from "@/components/communication/SetupStepsNav";
import StatusChip from "@/components/StatusChip";

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

  const isConnected = !!connection;
  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ?? "";

  // Never pass the raw connection to a client component — accessToken/
  // appSecret are Meta credentials that stay server-side (see
  // types/index.ts's WhatsAppConnection comment). Only whether a value is
  // saved is needed to render the masked "Saved" state.
  const connectionView = connection
    ? {
        phoneNumberId: connection.phoneNumberId,
        hasAccessToken: !!connection.accessToken,
        hasAppSecret: !!connection.appSecret,
        wabaId: connection.wabaId,
        phoneNumber: connection.phoneNumber,
        lastError: connection.lastError,
      }
    : null;

  // "Verified by Meta" has no backing signal today — the webhook GET
  // handshake (app/api/webhooks/whatsapp/route.ts) responds to Meta but
  // never records that it happened. This is inferred purely from the
  // connection being saved, not a real confirmation from Meta.
  const steps: SetupStep[] = [
    {
      label: "Connection",
      sublabel: isConnected ? "Connected" : "Not connected",
      done: isConnected,
      href: "#connection-section",
    },
    {
      label: "Webhook",
      sublabel: !isConnected ? "Needs step 1" : "Verified by Meta",
      done: isConnected,
      href: "#webhook-section",
    },
    {
      label: "Message templates",
      sublabel: templates.length > 0 ? `${templates.length} template${templates.length === 1 ? "" : "s"}` : "None yet",
      done: templates.length > 0,
      href: "#templates-section",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <header className="flex flex-col gap-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Communication</p>
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="font-display text-3xl text-brown-900">WhatsApp Messaging</h1>
          <StatusChip label={isConnected ? "Connected" : "Not connected"} tone={isConnected ? "positive" : "neutral"} />
        </div>
        <p className="text-sm text-brown-600">Connect your WhatsApp Business account so the clinic can message patients.</p>
      </header>

      <div className="mt-8 flex items-start gap-10">
        <SetupStepsNav steps={steps} />
        <div className="min-w-0 flex-1 space-y-6">
          <div id="connection-section">
            <WhatsAppSection connection={connectionView} />
          </div>
          <div id="webhook-section">
            <WebhookInfoSection verifyToken={verifyToken} verified={isConnected} />
          </div>
          <div id="templates-section">
            <MessageTemplatesSection templates={templates} hasConnection={isConnected} />
          </div>
        </div>
      </div>
    </div>
  );
}
