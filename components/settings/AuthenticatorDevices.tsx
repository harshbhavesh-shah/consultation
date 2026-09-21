"use client";

import { useState, type FormEvent } from "react";
import {
  startAddDeviceAction,
  confirmAddDeviceAction,
  removeDeviceAction,
} from "@/app/dashboard/settings/securityActions";
import type { EnrollmentResult } from "@/app/mfa/actions";

export interface AuthenticatorDevice {
  id: string;
  name: string;
  addedAt: string; // ISO
}

export default function AuthenticatorDevices({ devices }: { devices: AuthenticatorDevice[] }) {
  const [adding, setAdding] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [enrollment, setEnrollment] = useState<EnrollmentResult | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  function reset() {
    setAdding(false);
    setDeviceName("");
    setEnrollment(null);
    setCode("");
    setError(null);
  }

  async function handleStart(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const result = await startAddDeviceAction(deviceName);
    setBusy(false);
    if (result.error) return setError(result.error);
    setEnrollment(result);
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    if (!enrollment?.factorId) return;
    setError(null);
    setBusy(true);
    const result = await confirmAddDeviceAction(enrollment.factorId, code);
    setBusy(false);
    if (result.error) {
      setError(result.error);
      setCode("");
      return;
    }
    reset();
  }

  async function handleRemove(device: AuthenticatorDevice) {
    if (!confirm(`Remove "${device.name}"? You won't be able to use it to sign in.`)) return;
    setRemovingId(device.id);
    const result = await removeDeviceAction(device.id);
    setRemovingId(null);
    if (result.error) alert(result.error);
  }

  const inputClass =
    "w-full rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500";

  return (
    <div className="overflow-hidden rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
      {devices.map((d) => (
        <div key={d.id} className="flex items-center justify-between border-b border-beige-300 px-4 py-3 text-sm">
          <div>
            <div className="font-medium text-brown-900">{d.name}</div>
            <div className="text-xs text-brown-400">Added {new Date(d.addedAt).toLocaleDateString("en-IN")}</div>
          </div>
          {devices.length > 1 && (
            <button
              onClick={() => handleRemove(d)}
              disabled={removingId === d.id}
              className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      ))}

      <div className="px-4 py-3">
        {!adding && (
          <>
            <button
              onClick={() => setAdding(true)}
              className="text-sm font-medium text-gold-600 hover:underline"
            >
              Add another device
            </button>
            {devices.length < 2 && (
              <p className="mt-1 text-xs text-brown-400">
                Recommended: a second device means losing one phone won&apos;t lock you out.
              </p>
            )}
          </>
        )}

        {adding && !enrollment && (
          <form onSubmit={handleStart} className="space-y-3">
            <label className="block text-sm text-brown-600">
              Name this device
              <input
                autoFocus
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                placeholder="e.g. Backup phone"
                maxLength={40}
                className={`mt-1 ${inputClass}`}
              />
            </label>
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy}
                className="rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-beige-200 hover:bg-gold-600 disabled:opacity-60"
              >
                {busy ? "Starting…" : "Continue"}
              </button>
              <button type="button" onClick={reset} className="text-sm text-brown-600">
                Cancel
              </button>
            </div>
          </form>
        )}

        {adding && enrollment?.qrCode && (
          <form onSubmit={handleConfirm} className="space-y-3">
            <p className="text-sm text-brown-600">1. Scan this QR code with the authenticator app on the new device.</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={enrollment.qrCode} alt="QR code for the new authenticator device" className="h-40 w-40" />
            <p className="text-xs text-brown-400">
              Can&apos;t scan? Enter this key manually:{" "}
              <span className="break-all font-mono text-brown-700">{enrollment.secret}</span>
            </p>
            <p className="text-sm text-brown-600">2. Enter the 6-digit code it shows.</p>
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={7}
              placeholder="000000"
              aria-label="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={`${inputClass} max-w-[10rem] text-center tracking-[0.3em]`}
            />
            {error && <p className="text-sm text-red-700">{error}</p>}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={busy || code.replace(/\s/g, "").length !== 6}
                className="rounded-md bg-gold-500 px-4 py-2 text-sm font-semibold text-beige-200 hover:bg-gold-600 disabled:opacity-60"
              >
                {busy ? "Verifying…" : "Add device"}
              </button>
              <button type="button" onClick={reset} className="text-sm text-brown-600">
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
