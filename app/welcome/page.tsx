import Link from "next/link";

export default function WelcomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-sm rounded-xl bg-surface p-8 text-center shadow-card ring-1 ring-beige-300">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">ASC Consultation</p>
        <h1 className="mt-1 font-display text-2xl font-medium text-brown-900">Welcome</h1>
        <div className="mx-auto mb-6 mt-3 h-[2px] w-10 bg-gold-500" />

        <div className="space-y-3">
          <Link
            href="/login"
            className="block w-full rounded-md bg-brown-900 py-2.5 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="block w-full rounded-md border border-beige-300 py-2.5 text-sm font-semibold text-brown-700 transition-colors hover:border-gold-500 hover:text-gold-600"
          >
            Sign Up
          </Link>
        </div>
      </div>
    </main>
  );
}
