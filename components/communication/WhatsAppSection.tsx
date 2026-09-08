"use client";

import { useState, type FormEvent } from "react";
import { connectWhatsAppAction, disconnectWhatsAppAction } from "@/app/dashboard/communication/actions";
import type { WhatsAppConnection } from "@/types";

const inputClass =
  "w-full rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-brown-700">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-brown-400">{hint}</p>}
    </div>
  );
}

export default function WhatsAppSection({ connection }: { connection: WhatsAppConnection | null }) {
  const [editing, setEditing] = useState(!connection);
  const [phoneNumberId, setPhoneNumberId] = useState(connection?.phoneNumberId ?? "");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [wabaId, setWabaId] = useState(connection?.wabaId ?? "");
  const [phoneNumber, setPhoneNumber] = useState(connection?.phoneNumber ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await connectWhatsAppAction({
      phoneNumberId: phoneNumberId.trim(),
      accessToken: accessToken.trim() || undefined,
      appSecret: appSecret.trim() || undefined,
      wabaId: wabaId.trim(),
      phoneNumber: phoneNumber.trim(),
    });
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setAccessToken("");
    setAppSecret("");
    setEditing(false);
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect WhatsApp? Reminders, confirmations, and receipts will stop sending.")) return;
    await disconnectWhatsAppAction();
  }

  if (connection && !editing) {
    return (
      <div className="rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-sm font-medium text-brown-900">
              Connected{connection.phoneNumber ? ` · ${connection.phoneNumber}` : ""}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(true)}
              className="rounded-md border border-beige-300 px-3 py-1.5 text-xs font-medium text-brown-700 hover:bg-canvas"
            >
              Edit
            </button>
            <button
              onClick={handleDisconnect}
              className="rounded-md border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
            >
              Disconnect
            </button>
          </div>
        </div>
        {connection.lastError && (
          <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            Last error: {connection.lastError}
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
      <div className="rounded-md bg-canvas p-3 text-xs text-brown-600">
        From Meta Business Settings: create a System User with the{" "}
        <code className="rounded bg-beige-200 px-1 py-0.5">whatsapp_business_messaging</code> permission and
        generate a <strong>permanent</strong> token (not the 24h Quick-Start token) — see{" "}
        <a
          href="https://developers.facebook.com/docs/whatsapp/cloud-api/get-started"
          target="_blank"
          rel="noreferrer"
          className="text-gold-600 underline"
        >
          Meta&apos;s Cloud API setup guide
        </a>
        .
      </div>

      <Field label="Phone Number ID" hint="Business Settings → WhatsApp Accounts → Phone Numbers.">
        <input required value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} className={inputClass} />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Access Token" hint={connection ? "Leave blank to keep the current token." : undefined}>
          <input
            type="password"
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="App Secret" hint={connection ? "Leave blank to keep the current secret." : undefined}>
          <input
            type="password"
            value={appSecret}
            onChange={(e) => setAppSecret(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="WABA ID" hint="Optional — display only.">
          <input value={wabaId} onChange={(e) => setWabaId(e.target.value)} className={inputClass} />
        </Field>
        <Field label="WhatsApp Number" hint="Optional — display only, e.g. +91XXXXXXXXXX.">
          <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className={inputClass} />
        </Field>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-brown-900 px-4 py-2 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {connection && (
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-beige-300 px-4 py-2 text-sm font-medium text-brown-700 hover:bg-canvas"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
