"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Send } from "lucide-react";
import { deleteTemplateAction, sendTestMessageAction } from "@/app/dashboard/communication/actions";
import TemplateFormModal from "./TemplateFormModal";
import type { MessageTemplate } from "@/types";

export default function MessageTemplatesSection({
  templates,
  hasConnection,
}: {
  templates: MessageTemplate[];
  hasConnection: boolean;
}) {
  const [modalTemplate, setModalTemplate] = useState<MessageTemplate | null | undefined>(undefined);
  const [testTemplateId, setTestTemplateId] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testResult, setTestResult] = useState<{ error?: string; success?: boolean } | null>(null);
  const [sendingTest, setSendingTest] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    setBusyId(id);
    await deleteTemplateAction(id);
    setBusyId(null);
  }

  async function handleSendTest(e: React.FormEvent) {
    e.preventDefault();
    setSendingTest(true);
    setTestResult(null);
    const result = await sendTestMessageAction(testTemplateId, testPhone);
    setSendingTest(false);
    setTestResult(result);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-brown-400">Names and language codes must exactly match what&apos;s approved in Meta.</p>
        <button
          onClick={() => setModalTemplate(null)}
          className="flex items-center gap-1.5 rounded-md bg-gold-500 px-3 py-1.5 text-xs font-semibold text-beige-200 hover:bg-gold-600"
        >
          <Plus size={14} /> New Template
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl bg-surface p-6 text-center text-sm text-brown-400 shadow-soft ring-1 ring-beige-300">
          No templates yet.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-beige-300 px-4 py-3 text-sm last:border-0">
              <div>
                <div className="font-medium text-brown-900">{t.name}</div>
                <div className="text-xs text-brown-400">
                  {t.category.replace(/_/g, " ")} · {t.language}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setModalTemplate(t)} className="rounded-md p-1.5 text-brown-600 hover:bg-canvas" title="Edit">
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(t.id, t.name)}
                  disabled={busyId === t.id}
                  className="rounded-md p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalTemplate !== undefined && (
        <TemplateFormModal template={modalTemplate} onClose={() => setModalTemplate(undefined)} />
      )}

      {hasConnection && templates.length > 0 && (
        <div className="rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
          <h3 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-brown-900">
            <Send size={14} /> Send Test Message
          </h3>
          <form onSubmit={handleSendTest} className="flex flex-wrap items-end gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-brown-700">Template</label>
              <select
                required
                value={testTemplateId}
                onChange={(e) => setTestTemplateId(e.target.value)}
                className="rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none"
              >
                <option value="" disabled>
                  Select…
                </option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-brown-700">Phone Number</label>
              <input
                required
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                placeholder="9876543210"
                className="rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={sendingTest}
              className="rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-beige-200 hover:bg-gold-600 disabled:opacity-60"
            >
              {sendingTest ? "Sending…" : "Send Test"}
            </button>
          </form>
          {testResult?.success && <p className="mt-2 text-sm text-green-700">Sent — check the phone for delivery.</p>}
          {testResult?.error && <p className="mt-2 text-sm text-red-700">{testResult.error}</p>}
        </div>
      )}
    </div>
  );
}
