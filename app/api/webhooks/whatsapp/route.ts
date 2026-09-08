import { NextResponse } from "next/server";
import { activeProvider } from "@/lib/whatsapp/activeProvider";
import { getWhatsAppConnectionByPhoneNumberId } from "@/lib/firestore/whatsappConnections";
import { recordInboundMessage } from "@/lib/firestore/whatsappConversations";

// One shared webhook URL for every clinic — Meta's payload carries its own
// `phone_number_id`, which is looked up against each clinic's
// WhatsAppConnection to find who this event belongs to. See the
// Communication settings page (WebhookInfoSection) for where a clinic
// pastes this URL + WHATSAPP_WEBHOOK_VERIFY_TOKEN into their own Meta app's
// Webhooks config.

// Meta's one-time webhook verification handshake, run once when a clinic
// (or you) saves this URL in the Meta App Dashboard.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  // A malformed payload gets acked with 200 rather than re-thrown, so Meta
  // doesn't retry-hammer a broken endpoint.
  let events;
  try {
    events = activeProvider.parseInboundWebhook(rawBody);
  } catch (err) {
    console.error("Failed to parse WhatsApp webhook payload:", err);
    return NextResponse.json({ received: true, parsed: 0, recorded: 0 });
  }

  let recorded = 0;
  for (const event of events) {
    const connection = await getWhatsAppConnectionByPhoneNumberId(event.toPhone);
    if (!connection) {
      console.warn("WhatsApp webhook event for unknown phoneNumberId:", event.toPhone);
      continue;
    }

    if (!activeProvider.verifyWebhookSignature(rawBody, request.headers, connection)) {
      console.warn("WhatsApp webhook signature verification failed for clinic:", connection.clinicId);
      continue;
    }

    try {
      await recordInboundMessage(connection.clinicId, event);
      recorded++;
    } catch (err) {
      console.error("Failed to record inbound WhatsApp message:", err);
    }
  }

  // Always 200 — a 5xx here would make Meta retry-deliver the same events.
  return NextResponse.json({ received: true, parsed: events.length, recorded });
}
