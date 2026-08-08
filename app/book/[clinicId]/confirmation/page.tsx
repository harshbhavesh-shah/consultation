import { formatTo12Hour } from "@/lib/slots";

function formatLongDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// Deliberately does NOT show token number or queue position — those are
// staff-only (visible on the walk-in banner and the appointments
// dashboard), never surfaced to the patient themselves.
export default function BookingConfirmationPage({
  searchParams,
}: {
  searchParams: { name?: string; date?: string; time?: string };
}) {
  const { name, date, time } = searchParams;
  const hasDetails = name && date && time;

  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas p-4">
      <div className="w-full max-w-md rounded-xl bg-surface p-8 text-center shadow-card ring-1 ring-beige-300">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-gold-100 animate-scale-in">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gold-600">
            <path d="M20 6L9 17l-5-5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 className="mt-4 font-display text-2xl text-brown-900">Appointment Booked</h1>
        <p className="mt-1 text-sm text-brown-600">We&apos;ll see you soon.</p>

        {hasDetails ? (
          <div className="mt-6 space-y-2 rounded-lg bg-canvas p-4 text-left text-sm">
            <Row label="Name" value={name!} />
            <Row label="Date" value={formatLongDate(date!)} />
            <Row label="Time" value={formatTo12Hour(time!)} />
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-beige-300 py-1.5 last:border-0">
      <span className="text-brown-400">{label}</span>
      <span className="font-medium text-brown-900">{value}</span>
    </div>
  );
}
