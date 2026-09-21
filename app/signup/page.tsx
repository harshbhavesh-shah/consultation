"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signInAction, resendVerificationAction } from "@/lib/auth/actions";
import TurnstileWidget from "@/components/TurnstileWidget";
import { createClinicAction } from "./actions";

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [clinicName, setClinicName] = useState(searchParams.get("clinicName") ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [resendNote, setResendNote] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    let result: { error?: string; verificationSent?: boolean; emailFailed?: boolean };
    try {
      result = await createClinicAction({ clinicName, name, email, password, turnstileToken });
    } catch (err) {
      // A server action can reject outright (network failure, function
      // timeout, cold-start taking longer than the platform allows) rather
      // than resolving with {error}. Without this catch, that left the
      // button stuck on "Setting up your clinic…" forever with no feedback.
      console.error(err);
      setError("The request timed out. Your clinic may or may not have been created — try signing in first before creating it again.");
      setLoading(false);
      return;
    }

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Normal path: a confirmation email is on its way and the account can't
    // sign in until it's clicked.
    if (result.verificationSent) {
      if (result.emailFailed) {
        setResendNote("We couldn't send the email just now — press “Send the email again”.");
      }
      setVerificationSent(true);
      setLoading(false);
      return;
    }

    try {
      const outcome = await signInAction(email, password);
      if (outcome.error) {
        setError(outcome.error);
        setLoading(false);
        return;
      }
      router.push(searchParams.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Clinic was created, but signing you in failed — try signing in from the login page.");
      setLoading(false);
    }
  }

  async function handleResend() {
    setResendNote(null);
    const result = await resendVerificationAction(email);
    setResendNote(result.error ?? "Sent again — check your inbox (and spam folder).");
  }

  if (verificationSent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
        <div className="w-full max-w-sm rounded-xl bg-surface p-8 text-center shadow-card ring-1 ring-beige-300">
          <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Loupe by Radiance</p>
          <h1 className="mt-1 font-display text-2xl font-medium text-brown-900">Check your email</h1>
          <div className="mx-auto mb-5 mt-3 h-[2px] w-10 bg-gold-500" />
          <p className="text-sm text-brown-600">
            We sent a confirmation link to <span className="font-medium text-brown-900">{email}</span>. Click it to
            activate your clinic, then you&apos;ll set up two-step verification.
          </p>
          <button
            type="button"
            onClick={handleResend}
            className="mt-5 text-sm font-medium text-gold-600 hover:underline"
          >
            Send the email again
          </button>
          {resendNote && <p className="mt-2 text-xs text-brown-400">{resendNote}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 rounded-full bg-gold-100 blur-3xl animate-glow-in" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-72 w-72 rounded-full bg-beige-200 blur-3xl animate-glow-in" />

      <div className="relative w-full max-w-sm rounded-xl bg-surface p-8 shadow-card ring-1 ring-beige-300">
        <p className="text-center text-xs font-medium uppercase tracking-wide text-brown-400">
          Loupe by Radiance
        </p>
        <h1 className="mt-1 text-center font-display text-2xl font-medium text-brown-900">
          Create your clinic
        </h1>
        <div className="mx-auto mb-6 mt-3 h-[2px] w-10 bg-gold-500" />

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Clinic Name" id="clinicName">
            <input
              id="clinicName"
              required
              autoFocus
              value={clinicName}
              onChange={(e) => setClinicName(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Your Name" id="name">
            <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </Field>

          <Field label="Email" id="email">
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Password" id="password">
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </Field>

          <TurnstileWidget onToken={setTurnstileToken} />

          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-gold-500 py-2.5 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
          >
            {loading ? "Setting up your clinic…" : "Create Clinic"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-brown-600">
          Already have an account?{" "}
          <a href="/login" className="font-medium text-gold-600 hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}

const inputClass =
  "w-full rounded-md border border-beige-300 bg-canvas px-3 py-2 text-sm text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500";

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-brown-700">
        {label}
      </label>
      {children}
    </div>
  );
}
