"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  savePrescriptionAction,
  saveTemplateAction,
  deleteTemplateAction,
} from "@/app/dashboard/prescriptions/actions";
import PrintButton from "./PrintButton";
import PrescriptionPaper from "./PrescriptionPaper";
import type { Appointment, Clinic, Medication, PrescriptionTemplate } from "@/types";

const EMPTY: Medication = { name: "", dose: "", frequency: "", duration: "", instructions: "" };

const FREQUENCIES = [
  "Once daily",
  "Twice daily",
  "Three times daily",
  "At night",
  "Morning",
  "Alternate days",
  "Once a week",
  "As needed",
];
const DURATIONS = ["3 days", "5 days", "1 week", "2 weeks", "4 weeks", "6 weeks", "3 months"];

export default function PrescriptionEditor({
  clinic,
  appointment,
  patientCode,
  rxCode,
  initialMedications,
  initialAdvice,
  initialTemplates,
}: {
  clinic: Clinic;
  appointment: Appointment;
  patientCode?: string;
  rxCode: string;
  initialMedications: Medication[];
  initialAdvice: string;
  initialTemplates: PrescriptionTemplate[];
}) {
  const [meds, setMeds] = useState<Medication[]>(initialMedications.length ? initialMedications : [{ ...EMPTY }]);
  const [advice, setAdvice] = useState(initialAdvice);
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState(initialTemplates);
  const [pickedId, setPickedId] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  function update(i: number, key: keyof Medication, value: string) {
    setMeds((prev) => prev.map((m, idx) => (idx === i ? { ...m, [key]: value } : m)));
    setMessage(null);
  }

  function loadTemplate() {
    const t = templates.find((x) => x.id === pickedId);
    if (!t) return;
    // Adds to what's already there (dropping the blank starter row), so
    // two templates can be combined.
    setMeds((prev) => [...prev.filter((m) => m.name.trim() !== ""), ...t.medications.map((m) => ({ ...m }))]);
    setAdvice((prev) => (prev.trim() ? `${prev.trim()}\n${t.advice}`.trim() : t.advice));
    setMessage(null);
  }

  async function handleSaveTemplate() {
    setSavingTemplate(true);
    setMessage(null);
    const result = await saveTemplateAction(templateName, meds, advice);
    setSavingTemplate(false);
    if (result.error || !result.template) {
      setMessage({ ok: false, text: result.error ?? "Could not save the template." });
      return;
    }
    const saved = result.template;
    setTemplates((prev) => [...prev.filter((t) => t.id !== saved.id), saved].sort((a, b) => a.name.localeCompare(b.name)));
    setTemplateName("");
    setMessage({ ok: true, text: `Template "${saved.name}" saved.` });
  }

  async function handleDeleteTemplate() {
    const t = templates.find((x) => x.id === pickedId);
    if (!t || !confirm(`Delete the template "${t.name}"?`)) return;
    const result = await deleteTemplateAction(t.id);
    if (result.error) {
      setMessage({ ok: false, text: result.error });
      return;
    }
    setTemplates((prev) => prev.filter((x) => x.id !== t.id));
    setPickedId("");
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    const result = await savePrescriptionAction(appointment.id, meds, advice);
    setSaving(false);
    setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: "Saved." });
  }

  return (
    <div className="flex flex-col gap-6 xl:flex-row xl:items-start print:block">
      <div className="w-full flex-none space-y-4 print:hidden xl:w-[420px]">
        <datalist id="rx-frequencies">
          {FREQUENCIES.map((f) => (
            <option key={f} value={f} />
          ))}
        </datalist>
        <datalist id="rx-durations">
          {DURATIONS.map((d) => (
            <option key={d} value={d} />
          ))}
        </datalist>

        <div className="space-y-3 rounded-xl bg-surface p-4 shadow-soft ring-1 ring-beige-300">
          <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Templates</p>
          {templates.length > 0 ? (
            <div className="flex gap-2">
              <select
                value={pickedId}
                onChange={(e) => setPickedId(e.target.value)}
                aria-label="Saved templates"
                className="h-10 min-w-0 flex-1 rounded-lg border border-beige-300 bg-surface px-3 text-[15px] text-brown-900 outline-none focus:border-gold-500"
              >
                <option value="">Choose a template</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadTemplate}
                disabled={!pickedId}
                className="h-10 rounded-lg bg-gold-500 px-4 text-sm font-medium text-white hover:bg-gold-600 disabled:opacity-50"
              >
                Add
              </button>
              <button
                type="button"
                onClick={handleDeleteTemplate}
                disabled={!pickedId}
                aria-label="Delete selected template"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-beige-300 text-brown-400 hover:text-red-700 disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ) : (
            <p className="text-sm text-brown-400">No templates yet. Fill in a prescription and save it below.</p>
          )}
          <div className="flex gap-2">
            <input
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="Save current as… (e.g. Acne starter)"
              className="h-10 min-w-0 flex-1 rounded-lg border border-beige-300 bg-surface px-3 text-[15px] text-brown-900 outline-none focus:border-gold-500"
            />
            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={savingTemplate || !templateName.trim()}
              className="h-10 rounded-lg border border-beige-300 px-4 text-sm font-medium text-brown-900 hover:border-gold-500 hover:text-gold-600 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>

        {meds.map((m, i) => (
          <fieldset key={i} className="space-y-3 rounded-xl bg-surface p-4 shadow-soft ring-1 ring-beige-300">
            <div className="flex items-center justify-between">
              <legend className="float-left text-xs font-medium uppercase tracking-wide text-brown-400">
                Medicine {i + 1}
              </legend>
              <button
                type="button"
                onClick={() => setMeds((prev) => (prev.length === 1 ? [{ ...EMPTY }] : prev.filter((_, idx) => idx !== i)))}
                aria-label={`Remove medicine ${i + 1}`}
                className="text-brown-400 hover:text-red-700"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <Input label="Name" value={m.name} onChange={(v) => update(i, "name", v)} placeholder="Adapalene gel" />
            <div className="grid grid-cols-3 gap-3">
              <Input label="Strength" value={m.dose} onChange={(v) => update(i, "dose", v)} placeholder="0.1%" />
              <Input label="Frequency" value={m.frequency} onChange={(v) => update(i, "frequency", v)} list="rx-frequencies" />
              <Input label="Duration" value={m.duration} onChange={(v) => update(i, "duration", v)} list="rx-durations" />
            </div>
            <Input
              label="Instructions"
              value={m.instructions}
              onChange={(v) => update(i, "instructions", v)}
              placeholder="Apply a thin layer, avoid eyes"
            />
          </fieldset>
        ))}

        <button
          type="button"
          onClick={() => setMeds((prev) => [...prev, { ...EMPTY }])}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-beige-300 text-sm font-medium text-brown-600 hover:border-gold-500 hover:text-gold-600"
        >
          <Plus size={16} />
          Add medicine
        </button>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-brown-600">Advice</label>
          <textarea
            value={advice}
            onChange={(e) => {
              setAdvice(e.target.value);
              setMessage(null);
            }}
            rows={4}
            placeholder="Sunscreen daily, avoid picking at lesions"
            className="w-full rounded-lg border border-beige-300 bg-surface px-3 py-2 text-[15px] text-brown-900 outline-none focus:border-gold-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="h-11 rounded-lg bg-gold-500 px-5 text-[15px] font-medium text-white transition-colors hover:bg-gold-600 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save prescription"}
          </button>
          {message && <span className={`text-sm ${message.ok ? "text-green-700" : "text-red-700"}`}>{message.text}</span>}
        </div>
        <p className="text-xs text-brown-400">Save before printing. The sheet on the right is what gets printed.</p>
      </div>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex justify-end print:hidden">
          <PrintButton />
        </div>
        <PrescriptionPaper
          clinic={clinic}
          appointment={appointment}
          patientCode={patientCode}
          medications={meds}
          advice={advice}
          rxCode={rxCode}
        />
      </div>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  list,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  list?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label className="text-xs font-medium text-brown-600">{label}</label>
      <input
        value={value}
        list={list}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-lg border border-beige-300 bg-surface px-3 text-[15px] text-brown-900 outline-none focus:border-gold-500"
      />
    </div>
  );
}
