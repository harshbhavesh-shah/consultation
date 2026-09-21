"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sendReplyAction, markConversationReadAction, loadConversationMessagesAction } from "@/app/dashboard/inbox/actions";
import type { WhatsAppConversation, WhatsAppMessage } from "@/types";

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

// Raw Postgres row shapes as Realtime delivers them (snake_case column
// names, timestamps as ISO strings) — translated into the app's
// WhatsAppConversation/WhatsAppMessage shape below, same translation-
// boundary principle as lib/db/*.ts (those run server-side; this is the
// one place that has to do it client-side, since Realtime payloads are raw
// rows, not something that goes through our data layer).
interface ConversationRow {
  id: string;
  clinic_id: string;
  patient_id: string | null;
  patient_name: string | null;
  phone_number: string;
  last_message_preview: string;
  last_message_at: string;
  unread_count: number;
  updated_at: string;
}
interface MessageRow {
  id: string;
  clinic_id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  body: string;
  status: WhatsAppMessage["status"];
  template_id: string | null;
  provider_message_id: string | null;
  created_at: string;
}

function toConversation(row: ConversationRow): WhatsAppConversation {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    patientId: row.patient_id,
    patientName: row.patient_name,
    phoneNumber: row.phone_number,
    lastMessagePreview: row.last_message_preview,
    lastMessageAt: new Date(row.last_message_at).getTime(),
    unreadCount: row.unread_count,
    updatedAt: new Date(row.updated_at).getTime(),
  };
}
function toMessage(row: MessageRow): WhatsAppMessage {
  return {
    id: row.id,
    clinicId: row.clinic_id,
    conversationId: row.conversation_id,
    direction: row.direction,
    body: row.body,
    status: row.status,
    templateId: row.template_id,
    providerMessageId: row.provider_message_id,
    createdAt: new Date(row.created_at).getTime(),
  };
}

// Supabase Realtime (Postgres Changes) replaces Firestore's onSnapshot
// here — same live-update role, different shape: instead of a query
// snapshot with the full current result set on every change, each event is
// one changed row, merged into local state by hand below. RLS on
// whatsapp_conversations/whatsapp_messages (see
// prisma/migrations/20260920180000_auth_rls_and_claims_hook) scopes each
// subscriber to their own clinic's rows, same protection firestore.rules
// gave the old listeners. All *writes* still go through server actions
// using the Prisma/service connection.
export default function InboxClient({
  clinicId,
  initialConversations,
}: {
  clinicId: string;
  initialConversations: WhatsAppConversation[];
}) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(initialConversations[0]?.id ?? null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`whatsapp-conversations-${clinicId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_conversations", filter: `clinic_id=eq.${clinicId}` },
        (payload) => {
          setConversations((prev) => {
            if (payload.eventType === "DELETE") {
              return prev.filter((c) => c.id !== (payload.old as ConversationRow).id);
            }
            const updated = toConversation(payload.new as ConversationRow);
            const withoutOld = prev.filter((c) => c.id !== updated.id);
            return [...withoutOld, updated].sort((a, b) => b.lastMessageAt - a.lastMessageAt);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clinicId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    const supabase = createClient();

    // Realtime only streams changes from the moment of subscribing —
    // fetch the existing thread once up front, same initial-load role the
    // Firestore query's first snapshot played.
    loadConversationMessagesAction(selectedId).then((initial) => {
      if (!cancelled) setMessages(initial);
    });

    const channel = supabase
      .channel(`whatsapp-messages-${selectedId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages", filter: `conversation_id=eq.${selectedId}` },
        (payload) => {
          const incoming = toMessage(payload.new as MessageRow);
          setMessages((prev) => (prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]));
        }
      )
      .subscribe();

    markConversationReadAction(selectedId);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [selectedId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend() {
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    setError(null);
    const text = draft;
    setDraft("");
    const result = await sendReplyAction(selectedId, text);
    setSending(false);
    if (result.error) {
      setError(result.error);
      setDraft(text);
    }
  }

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  if (conversations.length === 0) {
    return (
      <div className="rounded-xl bg-surface p-10 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
        No conversations yet.
      </div>
    );
  }

  return (
    <div className="grid h-[calc(100vh-160px)] grid-cols-1 overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300 md:grid-cols-[340px_1fr]">
      <div className="overflow-y-auto border-b border-beige-300 md:border-b-0 md:border-r">
        {conversations.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelectedId(c.id)}
            className={`flex w-full items-start justify-between gap-2 border-b border-beige-300 px-4 py-3 text-left text-sm transition-colors last:border-0 ${
              c.id === selectedId ? "bg-canvas" : "hover:bg-canvas"
            }`}
          >
            <div className="min-w-0">
              <div className="truncate font-medium text-brown-900">{c.patientName || c.phoneNumber}</div>
              <div className="truncate text-xs text-brown-400">{c.lastMessagePreview}</div>
            </div>
            {c.unreadCount > 0 && (
              <span className="flex-shrink-0 rounded-full bg-gold-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {c.unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-col overflow-hidden">
        {selected ? (
          <>
            <div className="flex items-center justify-between border-b border-beige-300 px-4 py-3">
              <div>
                <div className="text-sm font-medium text-brown-900">{selected.patientName || selected.phoneNumber}</div>
                <div className="text-xs text-brown-400">{selected.phoneNumber}</div>
              </div>
              {selected.patientId && (
                <Link href={`/dashboard/patients/${selected.patientId}`} className="text-xs font-medium text-gold-600 hover:underline">
                  View patient
                </Link>
              )}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${
                      m.direction === "outbound" ? "bg-brown-900 text-beige-200" : "bg-canvas text-brown-900"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.body}</p>
                    <p className={`mt-1 text-[10px] ${m.direction === "outbound" ? "text-beige-300" : "text-brown-400"}`}>
                      {formatTimestamp(m.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-beige-300 p-3">
              {error && <p className="mb-2 text-xs text-red-700">{error}</p>}
              <div className="flex items-end gap-2">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a reply…"
                  rows={2}
                  className="w-full resize-none rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500"
                />
                <button
                  onClick={handleSend}
                  disabled={sending || !draft.trim()}
                  className="flex-shrink-0 rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
                >
                  Send
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-sm text-brown-400">Select a conversation.</div>
        )}
      </div>
    </div>
  );
}
