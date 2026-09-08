import { getSession } from "@/lib/session";
import { getClinicConversations } from "@/lib/firestore/whatsappConversations";
import InboxClient from "@/components/inbox/InboxClient";

export default async function InboxPage() {
  const session = await getSession();
  if (!session) return null;

  const conversations = await getClinicConversations(session.clinicId);

  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Inbox</p>
      <h1 className="mt-1 font-display text-2xl text-brown-900">WhatsApp Conversations</h1>
      <p className="mt-1 text-sm text-brown-400">Two-way WhatsApp conversations with patients.</p>

      <div className="mt-6">
        <InboxClient clinicId={session.clinicId} initialConversations={conversations} />
      </div>
    </div>
  );
}
