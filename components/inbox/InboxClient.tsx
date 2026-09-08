"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { sendReplyAction, markConversationReadAction } from "@/app/dashboard/inbox/actions";
import type { WhatsAppConversation, WhatsAppMessage } from "@/types";

function formatTimestamp(ms: number): string {
  return new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

// Firestore's client SDK is already used for auth (see login/signup) — this
// is its first Firestore (not just Auth) use, giving the Inbox live
// updates via onSnapshot instead of the poll/refresh-on-navigate pattern
// used elsewhere in this app. All *writes* still go through server actions
// using the Admin SDK; firestore.rules only grants clients read access to
// their own clinic's whatsappConversations/messages.
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
    const q = query(collection(db, "whatsappConversations"), where("clinicId", "==", clinicId), orderBy("lastMessageAt", "desc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setConversations(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            clinicId: data.clinicId,
            patientId: data.patientId ?? null,
            patientName: data.patientName ?? null,
            phoneNumber: data.phoneNumber,
            lastMessagePreview: data.lastMessagePreview ?? "",
            lastMessageAt: data.lastMessageAt,
            unreadCount: data.unreadCount ?? 0,
            updatedAt: data.updatedAt,
          } satisfies WhatsAppConversation;
        })
      );
    });
    return unsubscribe;
  }, [clinicId]);

  useEffect(() => {
    if (!selectedId) {
      setMessages([]);
      return;
    }
    const q = query(collection(db, "whatsappConversations", selectedId, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snap) => {
      setMessages(
        snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            clinicId: data.clinicId,
            conversationId: data.conversationId,
            direction: data.direction,
            body: data.body,
            status: data.status,
            templateId: data.templateId ?? null,
            providerMessageId: data.providerMessageId ?? null,
            createdAt: data.createdAt,
          } satisfies WhatsAppMessage;
        })
      );
    });
    markConversationReadAction(selectedId);
    return unsubscribe;
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
                  className="flex-shrink-0 rounded-md bg-brown-900 px-4 py-2 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
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
