"use client";

import { useEffect, useState } from "react";
import { Copy, Check } from "lucide-react";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
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
          title="Copy"
          className="flex-shrink-0 rounded-md border border-beige-300 p-2 text-brown-700 hover:bg-canvas"
        >
          {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
        </button>
      </div>
    </div>
  );
}

/** Shows the clinic what to paste into Meta's own Webhooks config screen —
 * the callback URL (this app, one shared route for every clinic) and the
 * shared verify token, used only for Meta's one-time GET handshake. */
export default function WebhookInfoSection({ verifyToken }: { verifyToken: string }) {
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <div className="space-y-4 rounded-xl bg-surface p-5 shadow-soft ring-1 ring-beige-300">
      <p className="text-xs text-brown-600">
        Paste these into Meta App Dashboard → WhatsApp → Configuration → Webhooks, then subscribe to the{" "}
        <code className="rounded bg-beige-200 px-1 py-0.5">messages</code> field.
      </p>
      <CopyField label="Callback URL" value={origin ? `${origin}/api/webhooks/whatsapp` : "Loading…"} />
      <CopyField label="Verify Token" value={verifyToken} />
    </div>
  );
}
