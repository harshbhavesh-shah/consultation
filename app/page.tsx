export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-md rounded-xl bg-surface p-8 shadow-soft ring-1 ring-beige-300 animate-fade-up">
        <p className="text-xs font-medium uppercase tracking-wide text-brown-400">
          ASC Consultation
        </p>
        <h1 className="mt-2 font-display text-2xl text-brown-900">
          Design system check
        </h1>
        <p className="mt-2 text-sm text-brown-600">
          Fraunces headings, Inter body, warm brown/beige/gold palette.
        </p>
        <span className="mt-4 inline-block rounded-full bg-gold-100 px-3 py-1 text-xs font-medium text-gold-600">
          gold accent badge
        </span>
      </div>
    </main>
  );
}
