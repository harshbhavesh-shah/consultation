"use client";

import { useState, type FormEvent } from "react";
import { addStaffAction } from "@/app/dashboard/settings/actions";
import type { UserRole } from "@/types";

export default function AddStaffForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("reception");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSaving(true);
    const result = await addStaffAction({ name, email, password, role });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setName("");
    setEmail("");
    setPassword("");
    setRole("reception");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Full Name">
          <input required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Role">
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className={inputClass}>
            <option value="reception">Reception</option>
            <option value="doctor">Doctor</option>
          </select>
        </Field>
      </div>
      <Field label="Email">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={inputClass}
        />
      </Field>
      <Field label="Temporary Password">
        <input
          type="password"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={inputClass}
        />
      </Field>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {success && <p className="text-sm text-green-700">Staff member added — they can sign in at /login now.</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-brown-900 px-4 py-2 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
      >
        {saving ? "Adding…" : "Add Staff Member"}
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
