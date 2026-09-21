"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { signInAction } from "@/lib/auth/actions";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signInAction(email, password);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push(searchParams.get("next") || "/dashboard");
      router.refresh();
    } catch (err) {
      console.error(err);
      setError("Something went wrong signing in. Check the browser console for details.");
      setLoading(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-canvas p-4">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-gold-100 blur-3xl animate-glow-in" />
      <div className="pointer-events-none absolute -right-24 -top-16 h-72 w-72 rounded-full bg-orange-100 blur-3xl animate-glow-in" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-amber-100 blur-3xl animate-glow-in" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 rounded-full bg-beige-200 blur-3xl animate-glow-in" />

      <div className="relative w-full max-w-sm rounded-2xl bg-surface p-10 shadow-card ring-1 ring-beige-300">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-gold-100 font-display text-2xl text-brown-900">
            A
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-brown-400">ASC Consultation</p>
            <h1 className="font-display text-3xl font-normal text-brown-900">Staff sign in</h1>
            <div className="mt-1 flex gap-1">
              <span className="h-1 w-[18px] rounded-full bg-gold-600" />
              <span className="h-1 w-[18px] rounded-full bg-green-600" />
              <span className="h-1 w-[18px] rounded-full bg-amber-600" />
              <span className="h-1 w-[18px] rounded-full bg-red-400" />
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-[18px]">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-medium text-brown-900">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="username"
              placeholder="name@clinic.in"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 w-full rounded-[10px] border border-beige-300 bg-canvas px-3.5 text-[15px] text-brown-900 outline-none transition-colors focus:border-gold-500 focus:bg-surface focus:ring-1 focus:ring-gold-500"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-sm font-medium text-brown-900">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`h-12 w-full rounded-[10px] border bg-canvas px-3.5 pr-12 text-[15px] text-brown-900 outline-none transition-colors focus:bg-surface focus:ring-1 focus:ring-gold-500 ${
                  error ? "border-red-300 focus:border-red-400" : "border-beige-300 focus:border-gold-500"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded-md p-2 text-brown-400 hover:text-brown-700"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div role="alert" className="flex items-start gap-2.5 rounded-[10px] bg-red-50 px-3.5 py-3 text-sm leading-snug text-red-800">
              <AlertCircle size={18} className="mt-px flex-none" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-0.5 h-[50px] rounded-[10px] bg-gold-500 text-[16px] font-semibold text-beige-200 transition-colors hover:bg-gold-600 disabled:opacity-60"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}
