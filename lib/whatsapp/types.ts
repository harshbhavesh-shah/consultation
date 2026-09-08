import "server-only";
import type { WhatsAppConnection } from "@/types";

export interface SendResult {
  providerMessageId: string;
}

export interface NormalizedInboundMessage {
  fromPhone: string;
  toPhone: string; // the clinic's phoneNumberId this arrived on
  body: string;
  providerMessageId: string;
  timestampMs: number;
}

/** Provider-agnostic seam — every caller imports lib/whatsapp/activeProvider
 * instead of a concrete provider module, so swapping providers later (or
 * adding a second one) never touches call sites. */
export interface WhatsAppProvider {
  name: string;

  /** Template messages are the only kind allowed outside a 24h customer
   * service window (i.e. any time the clinic is initiating contact —
   * confirmations, reminders, receipts). `templateName`/`languageCode`
   * must exactly match what's approved in Meta's Template Library; `params`
   * fill the template's ordered {{n}} placeholders. */
  sendTemplateMessage(
    connection: WhatsAppConnection,
    toPhone: string,
    templateName: string,
    params: string[],
    languageCode: string
  ): Promise<SendResult>;

  /** Free-form text — only valid as a reply within the 24h window opened by
   * the patient's last inbound message. Used by the Inbox's reply composer. */
  sendFreeText(connection: WhatsAppConnection, toPhone: string, text: string): Promise<SendResult>;

  /** Parses a raw webhook POST body into normalized inbound messages.
   * Non-text message types and status-only (delivery/read receipt)
   * payloads are skipped, not errored — see the implementation for why. */
  parseInboundWebhook(rawBody: string): NormalizedInboundMessage[];

  /** Verifies the webhook's signature header against this specific clinic's
   * appSecret. Must be constant-time. */
  verifyWebhookSignature(rawBody: string, headers: Headers, connection: WhatsAppConnection): boolean;
}
