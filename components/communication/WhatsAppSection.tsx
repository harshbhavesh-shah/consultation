"use client";

import { useState, type FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { connectWhatsAppAction, disconnectWhatsAppAction } from "@/app/dashboard/communication/actions";
import StatusChip from "@/components/StatusChip";

// Client-safe projection of WhatsAppConnection — the raw accessToken/
// appSecret never reach this component (types/index.ts says as much: "never
// sent to a client component, only used server-side"). Only whether a
// value has been saved is needed to render the masked "Saved" state.
export interface WhatsAppConnectionView {
  phoneNumberId: string;
  hasAccessToken: boolean;
  hasAppSecret: boolean;
  wabaId: string;
  phoneNumber: string;
  lastError: string | null;
}

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

function SecretField({
  label,
  saved,
  replacing,
  onReplace,
  value,
  onChange,
}: {
  label: string;
  saved: boolean;
  replacing: boolean;
  onReplace: () => void;
  value: string;
  onChange: (v: string) => void;
}) {
  const [show, setShow] = useState(false);

  if (saved && !replacing) {
    return (
      <div>
        <span className="mb-1.5 block text-sm font-medium text-brown-700">{label}</span>
        <div className="flex h-[42px] items-center justify-between rounded-md border border-beige-300 bg-canvas px-3">
          <span className="text-sm tracking-widest text-brown-600">••••••••••••</span>
          <span className="flex items-center gap-3">
            <StatusChip label="Saved" tone="positive" />
            <button
              type="button"
              onClick={onReplace}
              className="text-sm font-medium text-brown-900 underline underline-offset-2"
            >
              Replace
            </button>
          </span>
        </div>
        <p className="mt-1 text-xs text-brown-400">Stored securely. The full value is never shown again.</p>
      </div>
    );
  }

  return (
    <Field label={label} hint={saved ? "Leave blank to keep the current value." : undefined}>
      <div className="relative">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputClass} pr-10`}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? "Hide value" : "Show value"}
          className="absolute right-1 top-1/2 -translate-y-1/2 rounded p-1.5 text-brown-400 hover:text-brown-700"
        >
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  );
}

export default function WhatsAppSection({ connection }: { connection: WhatsAppConnectionView | null }) {
  const [phoneNumberId, setPhoneNumberId] = useState(connection?.phoneNumberId ?? "");
  const [accessToken, setAccessToken] = useState("");
  const [appSecret, setAppSecret] = useState("");
  const [wabaId, setWabaId] = useState(connection?.wabaId ?? "");
  const [phoneNumber, setPhoneNumber] = useState(connection?.phoneNumber ?? "");
  const [replacingToken, setReplacingToken] = useState(!connection?.hasAccessToken);
  const [replacingSecret, setReplacingSecret] = useState(!connection?.hasAppSecret);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    setJustSaved(false);
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
    setReplacingToken(false);
    setReplacingSecret(false);
    setJustSaved(true);
  }

  async function handleDisconnect() {
    if (!confirm("Disconnect WhatsApp? Reminders, confirmations, and receipts will stop sending.")) return;
    await disconnectWhatsAppAction();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
      <div className="flex min-h-[28px] flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-brown-900">Connection</h2>
        <div className="flex items-center gap-4">
          {connection && <StatusChip label="Connected" tone="positive" />}
          {connection && (
            <button
              type="button"
              onClick={handleDisconnect}
              className="text-sm font-medium text-red-700 hover:underline"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      <div className="rounded-md bg-canvas p-3 text-xs leading-relaxed text-brown-600">
        In Meta Business Settings, create a System User with the{" "}
        <code className="rounded bg-beige-200 px-1 py-0.5">whatsapp_business_messaging</code> permission and
        generate a <strong className="text-brown-900">permanent</strong> token. The 24 hour Quick Start token will
        stop working. See{" "}
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
        <input
          required
          value={phoneNumberId}
          onChange={(e) => setPhoneNumberId(e.target.value)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SecretField
          label="Access Token"
          saved={!!connection?.hasAccessToken}
          replacing={replacingToken}
          onReplace={() => setReplacingToken(true)}
          value={accessToken}
          onChange={setAccessToken}
        />
        <SecretField
          label="App Secret"
          saved={!!connection?.hasAppSecret}
          replacing={replacingSecret}
          onReplace={() => setReplacingSecret(true)}
          value={appSecret}
          onChange={setAppSecret}
        />
      </div>

      <div className="space-y-3 pt-1">
        <p className="text-xs font-semibold uppercase tracking-wide text-brown-400">Optional, display only</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="WABA ID" hint="Optional. Display only.">
            <input value={wabaId} onChange={(e) => setWabaId(e.target.value)} className={inputClass} />
          </Field>
          <Field label="WhatsApp Number" hint="Optional. Display only, for example +91XXXXXXXXXX.">
            <input
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+91XXXXXXXXXX"
              className={inputClass}
            />
          </Field>
        </div>
      </div>

      {connection?.lastError && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">Last error: {connection.lastError}</p>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}

      <div className="flex items-center gap-4">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-gold-500 px-5 py-2.5 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        {justSaved && !error && <span className="text-sm text-green-700">All changes saved</span>}
      </div>
    </form>
  );
}
