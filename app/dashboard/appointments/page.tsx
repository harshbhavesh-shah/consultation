import Link from "next/link";
import { Plus } from "lucide-react";
import { getSession } from "@/lib/session";
import { getAppointmentsForDate } from "@/lib/firestore/appointments";
import AppointmentsTable from "@/components/appointments/AppointmentsTable";
import DatePickerForm from "@/components/appointments/DatePickerForm";

function todayLocalStr(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const session = await getSession();
  if (!session) return null;

  const date = searchParams.date || todayLocalStr();
  const appointments = await getAppointmentsForDate(session.clinicId, date);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-brown-400">Appointments</p>
          <h1 className="mt-1 font-display text-2xl text-brown-900">{date}</h1>
        </div>
        <div className="flex items-center gap-3">
          <DatePickerForm date={date} />
          <Link
            href={`/dashboard/appointments/new?date=${date}`}
            className="flex items-center gap-1.5 rounded-md bg-brown-900 px-4 py-2 text-sm font-semibold text-beige-200 transition-colors hover:bg-gold-600"
          >
            <Plus size={16} />
            New
          </Link>
        </div>
      </div>

      <AppointmentsTable appointments={appointments} role={session.role} date={date} />
    </div>
  );
}
