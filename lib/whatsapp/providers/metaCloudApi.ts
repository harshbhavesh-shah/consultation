import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import type { WhatsAppConnection } from "@/types";
import type { NormalizedInboundMessage, SendResult, WhatsAppProvider } from "../types";

const GRAPH_API_VERSION = "v21.0";
const GRAPH_BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

async function callMessagesApi(
  connection: WhatsAppConnection,
  body: Record<string, unknown>
): Promise<SendResult> {
  const res = await fetch(`${GRAPH_BASE_URL}/${connection.phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    const metaError = json?.error as { message?: string; error_data?: { details?: string }; error_user_msg?: string } | undefined;
    const message =
      metaError?.error_user_msg || metaError?.error_data?.details || metaError?.message || `WhatsApp send failed (${res.status})`;
    throw new Error(message);
  }

  const providerMessageId = json?.messages?.[0]?.id;
  if (!providerMessageId) throw new Error("WhatsApp send succeeded but returned no message id.");
  return { providerMessageId };
}

// Meta's inbound webhook payload shape (only the parts we read):
// entry[].changes[].value.messages[] — present only when this delivery
// actually carries a new message; status-only deliveries (sent/delivered/
// read receipts for messages WE sent) have no `messages` array at all and
// are skipped here — there's nothing to record yet, not an error.
interface MetaWebhookPayload {
  entry?: {
    changes?: {
      value?: {
        metadata?: { phone_number_id?: string };
        messages?: {
          id?: string;
          from?: string;
          timestamp?: string;
          type?: string;
          text?: { body?: string };
        }[];
      };
    }[];
  }[];
}

export const metaCloudApiProvider: WhatsAppProvider = {
  name: "meta-cloud-api",

  sendTemplateMessage(connection, toPhone, templateName, params, languageCode) {
    return callMessagesApi(connection, {
      to: toPhone,
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(params.length
          ? { components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }] }
          : {}),
      },
    });
  },

  sendFreeText(connection, toPhone, text) {
    return callMessagesApi(connection, { to: toPhone, type: "text", text: { body: text } });
  },

  parseInboundWebhook(rawBody) {
    let payload: MetaWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return [];
    }

    const results: NormalizedInboundMessage[] = [];
    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        const phoneNumberId = value?.metadata?.phone_number_id;
        if (!phoneNumberId || !value?.messages) continue; // status-only delivery, not an error

        for (const msg of value.messages) {
          // Only plain text is handled — image/audio/location/interactive
          // etc. are skipped rather than guessed at.
          if (msg.type !== "text" || !msg.text?.body || !msg.from || !msg.id) continue;
          results.push({
            fromPhone: msg.from,
            toPhone: phoneNumberId,
            body: msg.text.body,
            providerMessageId: msg.id,
            timestampMs: msg.timestamp ? Number(msg.timestamp) * 1000 : Date.now(),
          });
        }
      }
    }
    return results;
  },

  verifyWebhookSignature(rawBody, headers, connection) {
    const signatureHeader = headers.get("x-hub-signature-256");
    if (!signatureHeader || !connection.appSecret) return false;

    const expected = "sha256=" + createHmac("sha256", connection.appSecret).update(rawBody, "utf8").digest("hex");
    const a = Buffer.from(signatureHeader);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  },
};
