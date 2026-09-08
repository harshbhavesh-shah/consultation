"use client";

import { useState, type FormEvent } from "react";
import { createTemplateAction, updateTemplateAction } from "@/app/dashboard/communication/actions";
import { TEMPLATE_VARIABLE_LABELS } from "@/types";
import type { MessageTemplate, MessageTemplateCategory } from "@/types";

const inputClass =
  "w-full rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500";

const CATEGORY_LABELS: Record<MessageTemplateCategory, string> = {
  appointment_confirmation: "Appointment confirmation",
  appointment_reminder: "Follow-up reminder",
  receipt_sent: "Receipt sent",
  no_show_followup: "No-show follow-up",
  visit_feedback: "Visit feedback",
  custom: "Custom",
};

export default function TemplateFormModal({
  template,
  onClose,
}: {
  template: MessageTemplate | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(template?.name ?? "");
  const [category, setCategory] = useState<MessageTemplateCategory>(template?.category ?? "custom");
  const [language, setLanguage] = useState(template?.language ?? "en");
  const [customLabels, setCustomLabels] = useState((template?.variableLabels ?? []).join(", "));
  const [bodyPreview, setBodyPreview] = useState(template?.bodyPreview ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isCustom = category === "custom";
  const variableLabels = isCustom
    ? customLabels.split(",").map((s) => s.trim()).filter(Boolean)
    : TEMPLATE_VARIABLE_LABELS[category];

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const input = { name: name.trim(), category, language: language.trim() || "en", variableLabels, bodyPreview };
    const result = template ? await updateTemplateAction(template.id, input) : await createTemplateAction(input);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-brown-900/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl bg-surface p-6 shadow-card ring-1 ring-beige-300"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-lg text-brown-900">{template ? "Edit Template" : "New Template"}</h2>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-brown-700">
              Template Name <span className="font-normal text-brown-400">(must exactly match Meta)</span>
            </label>
            <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brown-700">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MessageTemplateCategory)}
                className={inputClass}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brown-700">Language Code</label>
              <input value={language} onChange={(e) => setLanguage(e.target.value)} className={inputClass} />
            </div>
          </div>

          {isCustom ? (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-brown-700">
                Variables <span className="font-normal text-brown-400">(comma-separated, in order)</span>
              </label>
              <input
                value={customLabels}
                onChange={(e) => setCustomLabels(e.target.value)}
                placeholder="Patient name, Offer"
                className={inputClass}
              />
            </div>
          ) : (
            <p className="text-xs text-brown-400">
              Variables (in order): {variableLabels.length ? variableLabels.join(" → ") : "none"}
            </p>
          )}

          <div>
            <label className="mb-1.5 block text-sm font-medium text-brown-700">
              Body Preview <span className="font-normal text-brown-400">(for the Inbox display only — not sent to Meta)</span>
            </label>
            <textarea
              value={bodyPreview}
              onChange={(e) => setBodyPreview(e.target.value)}
              placeholder="Hi {{1}}, your appointment is confirmed for {{2}} at {{3}}."
              rows={3}
              className={inputClass}
            />
          </div>

          {error && <p className="text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-beige-300 px-4 py-2 text-sm font-medium text-brown-700 hover:bg-canvas"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-brown-900 px-4 py-2 text-sm font-semibold text-beige-200 hover:bg-gold-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
