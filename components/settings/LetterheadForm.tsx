"use client";

import { useState, type FormEvent } from "react";
import { updateLetterheadAction } from "@/app/dashboard/settings/actions";
import type { ClinicLetterhead } from "@/types";

export default function LetterheadForm({ initial }: { initial: ClinicLetterhead }) {
  const [values, setValues] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof ClinicLetterhead>(key: K, v: string) {
    setValues((prev) => ({ ...prev, [key]: v }));
    setSaved(false);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await updateLetterheadAction(values);
    setSaving(false);
    if (result.error) setError(result.error);
    else setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Doctor name">
          <input value={values.doctorName} onChange={(e) => set("doctorName", e.target.value)} className={inputClass} />
        </Field>
        <Field label="Qualifications">
          <input
            value={values.doctorQualifications}
            onChange={(e) => set("doctorQualifications", e.target.value)}
            placeholder="MD Dermatology"
            className={inputClass}
          />
        </Field>
        <Field label="Registration number">
          <input
            value={values.registrationNo}
            onChange={(e) => set("registrationNo", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Clinic phone">
          <input value={values.phone} onChange={(e) => set("phone", e.target.value)} className={inputClass} />
        </Field>
      </div>
      <Field label="Clinic address">
        <input value={values.address} onChange={(e) => set("address", e.target.value)} className={inputClass} />
      </Field>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {saved && <p className="text-sm text-green-700">Saved. New prescriptions and receipts will use these details.</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save letterhead"}
      </button>
    </form>
  );
}

const inputClass =
  "w-full rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-brown-700">{label}</label>
      {children}
    </div>
  );
}
