import Link from "next/link";
import { getSession } from "@/lib/session";
import { getAppointmentsForDate } from "@/lib/firestore/appointments";
import CallbackReminders from "@/components/CallbackReminders";

function todayLocalStr(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session) return null;

  const today = todayLocalStr();
  const appointments = await getAppointmentsForDate(session.clinicId, today);
  const waiting = appointments.filter((a) => a.status === "Booked").length;
  const visited = appointments.filter((a) => a.status === "Visited").length;

  return (
    <div className="mx-auto max-w-5xl">
      <CallbackReminders role={session.role} />

      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Today</p>
      <h1 className="mt-1 font-display text-2xl text-brown-900">
        Welcome back{session.email ? `, ${session.email.split("@")[0]}` : ""}
      </h1>

      <div className="mt-6 grid grid-cols-3 divide-x divide-beige-300 rounded-xl bg-surface shadow-soft ring-1 ring-beige-300">
        <Stat label="Total Today" value={appointments.length} />
        <Stat label="Waiting" value={waiting} />
        <Stat label="Seen" value={visited} accent />
      </div>

      <Link
        href={`/dashboard/appointments?date=${today}`}
        className="mt-6 inline-block rounded-md bg-brown-900 px-4 py-2 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600"
      >
        Go to today&apos;s appointments →
      </Link>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="p-6">
      <p className="text-xs font-medium uppercase tracking-wide text-brown-400">{label}</p>
      <p className={`mt-1 font-display text-2xl ${accent ? "text-gold-600" : "text-brown-900"}`}>{value}</p>
    </div>
  );
}
