import { getSession } from "@/lib/session";
import { getAppointmentsForDate } from "@/lib/db/appointments";
import AppointmentsViewSwitcher from "@/components/appointments/AppointmentsViewSwitcher";

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

  return <AppointmentsViewSwitcher appointments={appointments} role={session.role} date={date} />;
}
