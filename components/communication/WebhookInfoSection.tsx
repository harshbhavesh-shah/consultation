"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";
import StatusChip from "./StatusChip";

function CopyField({ label, value, disabled }: { label: string; value: string; disabled?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (disabled) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can fail (permissions, non-HTTPS) — the value is
      // still selectable/visible in the input, so this is non-fatal.
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-brown-700">{label}</label>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={value}
          onClick={(e) => (e.target as HTMLInputElement).select()}
          className="w-full truncate rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none"
        />
        <button
          type="button"
          onClick={copy}
          disabled={disabled}
          title="Copy"
          aria-label={`Copy ${label}`}
          className="flex-shrink-0 rounded-md border border-beige-300 p-2 text-brown-700 hover:bg-canvas disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
        >
          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

/** Shows the clinic what to paste into Meta's own Webhooks config screen —
 * the callback URL (this app, one shared route for every clinic) and the
 * shared verify token, used only for Meta's one-time GET handshake.
 *
 * `verified` reflects only that this clinic's WhatsApp connection is saved
 * — the backend has no record of Meta's GET handshake actually succeeding
 * (see the Communication page redesign notes for what persisting that
 * would take). Copy is disabled purely on whether a token value exists,
 * not on connection state — WHATSAPP_WEBHOOK_VERIFY_TOKEN is one shared
 * app-level secret, not generated per clinic. */
export default function WebhookInfoSection({ verifyToken, verified }: { verifyToken: string; verified: boolean }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const callbackUrl = origin ? `${origin}/api/webhooks/whatsapp` : "";

  return (
    <div className="space-y-4 rounded-xl bg-surface p-6 shadow-soft ring-1 ring-beige-300">
      <div className="flex min-h-[28px] items-center justify-between">
        <h2 className="font-display text-xl text-brown-900">Webhook</h2>
        {verified && <StatusChip label="Verified by Meta" tone="positive" />}
      </div>
      <p className="text-sm text-brown-600">
        Paste these into Meta App Dashboard → WhatsApp → Configuration → Webhooks, then subscribe to the{" "}
        <code className="rounded bg-beige-200 px-1 py-0.5">messages</code> field.
      </p>
      <CopyField label="Callback URL" value={callbackUrl || "Loading…"} disabled={!callbackUrl} />
      <CopyField
        label="Verify Token"
        value={verifyToken || "Not set — ask an administrator to configure it"}
        disabled={!verifyToken}
      />
    </div>
  );
}
