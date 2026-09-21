"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import LogoutButton from "@/components/LogoutButton";
import { startMfaEnrollmentAction, verifyMfaAction, type EnrollmentResult } from "./actions";

const inputClass =
  "h-12 w-full rounded-[10px] border border-beige-300 bg-canvas px-3.5 text-center text-xl tracking-[0.4em] text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500";

export default function MfaForm({ factorId: existingFactorId }: { factorId: string | null }) {
  const router = useRouter();
  const [enrollment, setEnrollment] = useState<EnrollmentResult | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const factorId = existingFactorId ?? enrollment?.factorId ?? null;
  const isSetup = existingFactorId === null;

  async function handleStart() {
    setError(null);
    setLoading(true);
    const result = await startMfaEnrollmentAction();
    setLoading(false);
    if (result.error) return setError(result.error);
    setEnrollment(result);
  }

  async function handleVerify(e: FormEvent) {
    e.preventDefault();
    if (!factorId) return;
    setError(null);
    setLoading(true);
    const result = await verifyMfaAction(factorId, code);
    if (result.error) {
      setError(result.error);
      setCode("");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-8 shadow-card ring-1 ring-beige-300">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-brown-400">Loupe by Radiance</p>
        <h1 className="mt-1 text-center font-display text-2xl font-medium text-brown-900">
          {isSetup ? "Set up two-step verification" : "Two-step verification"}
        </h1>
        <div className="mx-auto mb-5 mt-3 h-[2px] w-10 bg-gold-500" />

        {isSetup && !enrollment && (
          <div className="space-y-4">
            <p className="text-sm text-brown-600">
              Doctor accounts can see every patient record, so they need a second step at sign-in. You&apos;ll use an
              authenticator app (Google Authenticator, Microsoft Authenticator, Authy, 1Password…) on your phone.
            </p>
            {error && <ErrorBox message={error} />}
            <button
              type="button"
              onClick={handleStart}
              disabled={loading}
              className="h-[50px] w-full rounded-[10px] bg-gold-500 text-[16px] font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
            >
              {loading ? "Starting…" : "Get started"}
            </button>
          </div>
        )}

        {factorId && (
          <form onSubmit={handleVerify} className="space-y-4">
            {isSetup && enrollment?.qrCode && (
              <>
                <p className="text-sm text-brown-600">
                  1. Scan this QR code with your authenticator app.
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={enrollment.qrCode} alt="QR code for your authenticator app" className="mx-auto h-44 w-44" />
                <p className="text-xs text-brown-400">
                  Can&apos;t scan? Enter this key manually:{" "}
                  <span className="break-all font-mono text-brown-700">{enrollment.secret}</span>
                </p>
                <p className="text-sm text-brown-600">2. Enter the 6-digit code it shows.</p>
              </>
            )}
            {!isSetup && (
              <p className="text-sm text-brown-600">Enter the 6-digit code from your authenticator app.</p>
            )}

            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              maxLength={7}
              placeholder="000000"
              aria-label="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={inputClass}
            />
            {error && <ErrorBox message={error} />}
            <button
              type="submit"
              disabled={loading || code.replace(/\s/g, "").length !== 6}
              className="h-[50px] w-full rounded-[10px] bg-gold-500 text-[16px] font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
            >
              {loading ? "Verifying…" : isSetup ? "Turn on and continue" : "Verify"}
            </button>
            {!isSetup && (
              <p className="text-xs text-brown-400">
                Lost your phone? Use your second device if you added one. Otherwise, contact Loupe support to reset your two-step verification.
              </p>
            )}
          </form>
        )}

        <div className="mt-6 text-center">
          <LogoutButton />
        </div>
      </div>
    </main>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <div role="alert" className="flex items-start gap-2.5 rounded-[10px] bg-red-50 px-3.5 py-3 text-sm leading-snug text-red-800">
      <AlertCircle size={18} className="mt-px flex-none" />
      <span>{message}</span>
    </div>
  );
}
