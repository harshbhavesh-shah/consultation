import { getSession } from "@/lib/session";
import { getAppointment } from "@/lib/firestore/appointments";
import WalkInForm from "@/components/appointments/WalkInForm";

function todayLocalStr(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export default async function NewAppointmentPage({
  searchParams,
}: {
  searchParams: { editId?: string; date?: string };
}) {
  const session = await getSession();
  if (!session) return null;

  const initial = searchParams.editId
    ? await getAppointment(session.clinicId, searchParams.editId)
    : null;

  return <WalkInForm initial={initial ?? undefined} defaultDate={searchParams.date || todayLocalStr()} />;
}
